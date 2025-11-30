const { config } = require("./config");
const { run } = require("../src/index");
const path = require("path");

// 配置信息
const configInfo = {
  // 项目配置
  projects: [
    {
      name: "my-vue-app",
      gitUrl: "https://github.com/vgnip/my-vue-app",
      nodeVersion: "22.15.0",
      buildCommand: "npm run build",
      outputDir: "dist",
      remotePath: "/var/www/project1",
    },
    {
      name: "my-vue-app2",
      gitUrl: "https://github.com/vgnip/my-vue-app",
      nodeVersion: "24.0.2",
      buildCommand: "npm run build",
      outputDir: "dist",
      remotePath: "/var/www/project2",
    },
    {
      name: "my-vue-app3",
      gitUrl: "https://github.com/vgnip/my-vue-app",
      nodeVersion: "22.15.0",
      buildCommand: "npm run build",
      outputDir: "dist",
      remotePath: "/var/www/project3",
    },
    // {
    //   name: "my-vue-app2",
    //   gitUrl: "https://github.com/vgnip/my-vue-app",
    //   nodeVersion: "22.15.0",
    //   buildCommand: "npm run build",
    //   outputDir: "dist",
    //   remotePath: "/var/www/project1",
    // },
  ],

  // 工作目录
  workDir: path.join(process.cwd(), "frontend-builds"),

  // 是否保留临时文件（用于调试）
  keepTempFiles: true,
  service: config,
};

run(configInfo);
