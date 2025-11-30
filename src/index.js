const { execSync, spawn } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const { FileTransfer } = require("./FileTransfer");


class ProjectBuilder {
  constructor(config) {
    this.config = config;
  }

  // 执行命令的辅助方法
  async executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        stdio: "inherit",
        ...options,
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on("error", reject);
    });
  }

  // 创建Dockerfile
  createDockerfile(project, projectPath) {
    const dockerfileContent = `
FROM node:${project.nodeVersion}-alpine

WORKDIR /app

# 复制项目文件
COPY . .

# 安装依赖并构建
RUN npm -v
RUN ${
      project.buildCommand.includes("yarn")
        ? "yarn install"
        : project.buildCommand.includes("pnpm")
        ? "pnpm install"
        : "npm install"
    }
RUN ${project.buildCommand}

# 创建启动脚本
RUN echo "#!/bin/sh" > /start.sh && \\
    echo "cp -r ${project.outputDir}/* /output/" >> /start.sh && \\
    chmod +x /start.sh

CMD ["/start.sh"]
    `.trim();

    const dockerfilePath = path.join(projectPath, "Dockerfile");
    fs.writeFileSync(dockerfilePath, dockerfileContent);
    return dockerfilePath;
  }

  // 拉取Git项目
  async cloneProject(project) {
    const projectPath = path.join(this.config.workDir, project.name);

    console.log(`📥 Cloning ${project.name}...`);

    if (await fs.pathExists(projectPath)) {
      await fs.remove(projectPath);
    }

    await this.executeCommand(`git clone ${project.gitUrl} ${projectPath}`);
    return projectPath;
  }

  // 在Docker中构建项目
  async buildInDocker(project, projectPath) {
    const outputDir = path.join(this.config.workDir, `${project.name}-output`);

    if (await fs.pathExists(outputDir)) {
      await fs.remove(outputDir);
    }
    await fs.ensureDir(outputDir);

    console.log(
      `🐳 Building ${project.name} with Node ${project.nodeVersion}...`
    );

    // 创建Dockerfile
    this.createDockerfile(project, projectPath);

    // 构建Docker镜像
    const imageName = `frontend-build-${project.name.toLowerCase()}`;

    await this.executeCommand(`docker build -t ${imageName} ${projectPath}`, {
      cwd: projectPath,
    });

    // 运行Docker容器并复制构建结果
    await this.executeCommand(
      `docker run --rm -v ${outputDir}:/output ${imageName}`
    );

    // 清理Docker镜像
    await this.executeCommand(`docker rmi ${imageName}`);

    return outputDir;
  }

  // 构建单个项目
  async buildProject(project) {
    try {
      console.log(`\n🎯 Starting build for ${project.name}...`);

      // 1. 克隆项目
      const projectPath = await this.cloneProject(project);

      // 2. 在Docker中构建
      const buildOutputPath = await this.buildInDocker(project, projectPath);

      // 每次都创建新实例
      const transfer = new FileTransfer( this.config.service);
      try {
        console.log(
          "buildOutputPath, project.remotePath---",
          buildOutputPath,
          project.remotePath
        );
        await transfer.transferWithProgress(
          buildOutputPath,
          project.remotePath
        );
        console.log("传输成功");
      } catch (error) {
        console.error("传输失败:", error);
      } finally {
        transfer.close();
      }
      // 4. 清理临时文件
      if (!this.config.keepTempFiles) {
        await fs.remove(projectPath);
        await fs.remove(buildOutputPath);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to build ${project.name}:`, error.message);
      return false;
    }
  }

  // 构建所有项目
  async buildAll() {
    console.log("🚀 Starting build process for all projects...\n");

    // 创建工作目录
    await fs.ensureDir(this.config.workDir);

    const results = [];

    // 串联
    // for (const project of this.config.projects) {
    //   const success = await this.buildProject(project);
    //   results.push({ project: project.name, success });
    // }

    // 并发执行
    const list = [];
    for (const project of this.config.projects) {
      const success = this.buildProject(project);
      list.push(success);
    }

    const promiseAllList = Promise.all(list);

    const res = await promiseAllList;

    res.map((item) => {
      results.push({ project: item.name, success: item });
    });

    // 输出构建结果
    console.log("\n📊 Build Summary:");
    results.forEach((result) => {
      console.log(`  ${result.success ? "✅" : "❌"} ${result.project}`);
    });

    // 清理工作目录
    if (!this.config.keepTempFiles) {
      await fs.remove(this.config.workDir);
    }

    const allSuccess = results.every((result) => result.success);
    console.log(
      allSuccess
        ? "\n🎉 All projects built successfully!"
        : "\n⚠️ Some projects failed to build."
    );

    return allSuccess;
  }
}

// 主函数
async function run(configInfo) {
  // 检查Docker是否可用
  try {
    execSync("docker --version", { stdio: "ignore" });
  } catch (error) {
    console.error("❌ Docker is not available. Please install Docker first.");
    process.exit(1);
  }

  const builder = new ProjectBuilder(configInfo);

  // 支持构建特定项目
  const targetProject = process.argv[2];
  if (targetProject) {
    const project = configInfo.projects.find((p) => p.name === targetProject);
    if (project) {
      await builder.buildProject(project);
    } else {
      console.error(`❌ Project "${targetProject}" not found in config.`);
      process.exit(1);
    }
  } else {
    // 构建所有项目
    const success = await builder.buildAll();
    process.exit(success ? 0 : 1);
  }
}

// 运行脚本
if (require.main === module) {
  run({}).catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

module.exports ={
  run,
  ProjectBuilder
} ;
