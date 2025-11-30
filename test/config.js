const fs = require("fs");
const path = require("path")

const config = {
    host: '106.54.233.233',      // 服务器地址
    port: 22,                     // SSH 端口
    username: 'root',    // 用户名
    // password: '162870',    // 密码
    privateKey: fs.readFileSync(path.resolve(__dirname,"./key"))  // 或者使用私钥
  };

  module.exports ={
    config
  }