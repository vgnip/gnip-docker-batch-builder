// const client = require("scp2");
const path = require("path");
const { config } = require("./config");
const fs = require("fs");
const { Client } = require("ssh2");
// 移除模块级别的 conn

class FileTransfer {
  constructor(config) {
    this.config = {
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey,
    };

    this.conn = new Client();
  }

  /**
   * 传输整个文件夹
   */
  async transferFolder(localPath, remotePath) {
    return new Promise((resolve, reject) => {
      console.log(
        `开始传输: ${localPath} -> ${this.config.host}:${remotePath}`
      );

      // 使用 scp2 或其他方式
      // 这里需要引入 scp2
      const client = require("scp2");
      client.scp(
        localPath,
        {
          ...this.config,
          path: remotePath,
        },
        (err) => {
          if (err) {
            console.error("❌ 传输失败:", err);
            reject(err);
          } else {
            console.log("✅ 文件传输完成！");
            resolve();
          }
        }
      );
    });
  }

  /**
   * 带进度显示的传输
   */
  async transferWithProgress(localPath, remotePath) {
    return new Promise((resolve, reject) => {
      // 使用实例级别的 conn
      this.conn.on("ready", () => {
        console.log("SSH 连接已建立");

        this.conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          this.uploadFolder(sftp, localPath, remotePath, resolve, reject);
        });
      });

      this.conn.on("error", (err) => {
        console.error("SSH 连接错误:", err);
        reject(err);
      });

      this.conn.on("close", () => {
        console.log("SSH 连接已关闭");
      });

      console.log("正在建立 SSH 连接...");
      this.conn.connect(this.config);
    });
  }

  /**
   * 递归上传文件夹（带进度显示）
   */
  uploadFolder(sftp, localPath, remotePath, resolve, reject) {
    // 确保本地路径存在
    if (!fs.existsSync(localPath)) {
      reject(new Error(`本地文件夹不存在: ${localPath}`));
      return;
    }

    const stats = fs.statSync(localPath);
    if (!stats.isDirectory()) {
      reject(new Error(`路径不是文件夹: ${localPath}`));
      return;
    }

    const items = fs.readdirSync(localPath);
    let completed = 0;
    const total = items.length;

    if (total === 0) {
      console.log("📁 文件夹为空，无需传输");
      this.conn.end();
      resolve();
      return;
    }

    console.log(`📁 发现 ${total} 个文件/文件夹`);

    // 先创建远程目录
    sftp.mkdir(remotePath, (err) => {
      if (err && err.code !== 4) {
        // 忽略目录已存在的错误
        console.log(`创建远程目录: ${remotePath}`);
      }

      items.forEach((item) => {
        const localItemPath = path.join(localPath, item);
        const remoteItemPath = path.join(remotePath, item).replace(/\\/g, "/");
        const stats = fs.statSync(localItemPath);

        if (stats.isDirectory()) {
          // 递归上传子目录
          this.uploadFolder(
            sftp,
            localItemPath,
            remoteItemPath,
            () => checkComplete(),
            reject
          );
        } else {
          // 上传文件
          this.uploadFile(
            sftp,
            localItemPath,
            remoteItemPath,
            () => checkComplete(),
            reject
          );
        }
      });
    });

    const checkComplete = () => {
      completed++;
      const progress = ((completed / total) * 100).toFixed(1);
      console.log(`📊 传输进度: ${progress}% (${completed}/${total})`);

      if (completed === total) {
        console.log("✅ 所有文件传输完成！");
        this.conn.end();
        resolve();
      }
    };
  }

  /**
   * 上传单个文件
   */
  uploadFile(sftp, localFilePath, remoteFilePath, onComplete, onError) {
    const readStream = fs.createReadStream(localFilePath);
    const writeStream = sftp.createWriteStream(remoteFilePath);

    const fileName = path.basename(localFilePath);
    console.log(`⬆️  上传: ${fileName}`);

    readStream.pipe(writeStream);

    writeStream.on("finish", () => {
      console.log(`✅ 完成: ${fileName}`);
      onComplete();
    });

    writeStream.on("error", (err) => {
      console.error(`❌ 上传失败: ${fileName}`, err);
      onError(err);
    });
  }

  /**
   * 检查本地文件夹是否存在
   */
  checkLocalFolder(localPath) {
    if (!fs.existsSync(localPath)) {
      throw new Error(`本地文件夹不存在: ${localPath}`);
    }

    const stats = fs.statSync(localPath);
    if (!stats.isDirectory()) {
      throw new Error(`路径不是文件夹: ${localPath}`);
    }
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.conn) {
      this.conn.end();
    }
  }
}

// 使用示例
async function start(localFolder, remoteFolder) {
  // 每次调用都创建新的 FileTransfer 实例
  const transfer = new FileTransfer(config);

  // 传输参数
  localFolder = localFolder || "./lib";
  remoteFolder = remoteFolder || "/aaa";

  try {
    // 检查本地文件夹
    transfer.checkLocalFolder(localFolder);

    console.log("🚀 使用 SFTP 协议传输（带进度）...");
    await transfer.transferWithProgress(localFolder, remoteFolder);
  } catch (error) {
    console.error("❌ 传输失败:", error.message);
  } finally {
    // 确保连接关闭
    transfer.close();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  start();
}

module.exports = {
  FileTransfer,
  start,
};
