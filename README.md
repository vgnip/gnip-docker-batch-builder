## 描述

nodejs 脚本工具，动态可配置灵活批量打包，解放手动打包上传服务器部署的痛苦，简易版本的 CICD 工具

## 安装

```
新建一个项目目录
npm init -y
yarn add gnip-bundle-tool
```

## 使用

新建 test.js，加入以下代码，自行更改部分必要配置，也可以看本项目的根目录下的 test.js 文件示例，改成自己想要打包的项目信息就可以啦

```js
//导入包
const { start } = require("gnip-docker-batch-builder");
const path = require("path");

const { config } = require("./config");
const { run } = require("../src/index");

// 配置信息
const configInfo = {
  // 项目配置
  projects: [
    {
      name: "my-vue-app",//项目名称
      gitUrl: "https://github.com/vgnip/my-vue-app",//仓库地址
      nodeVersion: "22.15.0",//node版本
      buildCommand: "npm run build",//打包命令
      outputDir: "dist",//输出文件名
      remotePath: "/var/www/project1",//服务器位置
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
  service: {
    host: "xxxx.xxxx.xxxx.xxx", // 服务器地址
    port: 22, // SSH 端口
    username: "root", // 用户名
    // password: '162870',    // 密码
    privateKey: fs.readFileSync(path.resolve(__dirname, "./key")), // 或者使用私钥
  },
};

run(configInfo);
```

## 支持功能

- 动态 node 版本
- 打包输入到本机任意目录
- 动态根据分支或者 tag 打包
- 支持合并分支、tag
- 可配置并发执行或者链式执行
- 拉取远程代码在打包后不占用本地磁盘空间，打包完成后自动清空工作空间
- 支持串行或者并发打包(并发打包不支持缓存,注意并发打包必须保证所有项目在同一个 node 版本下能执行脚本不报错)
- 支持可配置缓存打包文件或者清理工作空间（大大减少打包时间,同时缓存会占用一定的磁盘空间）
- 支持可配置是否自动压缩替换打包后的项目
- 支持将对应打包输出资源上传到服务器
- docker容器打包，不用担心node隔离或者打包消耗cpu资源影响本地开发



## 后续支持

- 支持迁出特定分支
- 支持合并分支
- 支持tag
- 支持并发或则串行打包
- 支持压缩包

