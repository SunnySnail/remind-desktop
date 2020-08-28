//
// thanks electron-vue
//
process.env.NODE_ENV = 'development';
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');
const webpack = require('webpack');
const electron = require('electron');
const WebpackDevServer = require('webpack-dev-server');
const webpackHotMiddleware = require('webpack-hot-middleware');

const webpackMainConfig = require('./webpack.config.main.dev.babel');
const webpackRendererConfig = require('./webpack.config.renderer.dev.babel');

// electron进程
let electronProcess = null;
let manualRestart = false;
let hotMiddleware;

const logStats = (proc, data) => {
  let log = '';

  log += chalk.yellow.bold(
    `┏ ${proc} Process ${new Array(19 - proc.length + 1).join('-')}`
  );
  log += '\n\n';

  if (typeof data === 'object') {
    data
      .toString({
        colors: true,
        chunks: false,
      })
      .split(/\r?\n/)
      .forEach((line) => {
        log += `  ${line}\n`;
      });
  } else {
    log += `  ${data}\n`;
  }

  log += `\n${chalk.yellow.bold(`┗ ${new Array(28 + 1).join('-')}`)}\n`;

  console.log(log);
};

const startElectron = async () => {
  // if (process.platform === 'win32') {
  //   electronProcess = spawn(win32ExePath,  ['--inspect=5858', path.join(__dirname, '../dist/index.js')]);
  // } else {
  electronProcess = spawn(electron, [
    '--inspect=5858',
    path.join(__dirname, '../app/dist/main.js'),
  ]);
  // }

  electronProcess.stdout.on('data', (data) => {
    logStats('electron', data.toString());
  });
  electronProcess.stderr.on('data', (data) => {
    logStats('electron', data.toString());
  });

  electronProcess.on('close', (code) => {
    console.error('electron close!', code);
    if (code === 110) {
      startElectron();
    } else if (!manualRestart) {
      process.exit();
    }
  });
};

// 启动主进程
const startMain = () => {
  return new Promise((resolve) => {
    webpackMainConfig.mode = 'development';
    // 远程断点调试
    // https://stackoverflow.com/questions/42881493/debugging-typescript-with-source-maps-and-webpack
    webpackMainConfig.devtool = 'source-map';
    webpackMainConfig.output.path = path.join(__dirname, '../app/dist');

    const compiler = webpack(webpackMainConfig);

    compiler.watch({}, (err, stats) => {
      if (err) {
        console.log(err);
        return;
      }

      if (stats.hasErrors()) {
        logStats('Main', stats);
      }

      if (electronProcess && electronProcess.kill) {
        manualRestart = true;
        process.kill(electronProcess.pid);
        electronProcess = null;

        setTimeout(() => {
          startElectron();

          setTimeout(() => {
            manualRestart = false;
          }, 5000);
        }, 100);
      }

      resolve();
    });
  });
};

const startRenderer = () => {
  return new Promise((resolve) => {
    webpackRendererConfig.devtool = 'cheap-module-eval-source-map';
    webpackRendererConfig.mode = 'development';
    webpackMainConfig.output.path = path.join(__dirname, '../app/dist');

    const compiler = webpack(webpackRendererConfig);
    hotMiddleware = webpackHotMiddleware(compiler, {
      log: false,
      heartbeat: 2500,
    });

    const server = new WebpackDevServer(compiler, {
      ...webpackRendererConfig.devServer,
      before(app, ctx) {
        app.use(hotMiddleware);
        ctx.middleware.waitUntilValid(() => {
          resolve();
        });
      },
      stats: 'errors-only',
      overlay: true,
    });

    server.listen(webpackRendererConfig.devServer.port);
  });
};

// const electronLog = (data, color) => {
//   let log = '';
//   data = data.toString().split(/\r?\n/);
//   data.forEach(line => {
//     log += `  ${line}\n`;
//   });
//   if (/[0-9A-z]+/.test(log)) {
//     console.log(
//       chalk[color].bold(`┏ Electron --${new Date().toString()}-----------------`) +
//       '\n\n' +
//       log +
//       chalk[color].bold('┗ ----------------------------') +
//       '\n'
//     );
//   }
// };

// const ensureElectron32 = async () => {
//   if (fs.existsSync(win32ExePath)) {
//     return;
//   }

//   if (fs.existsSync(win32Dir)) {
//     fs.removeSync(win32Dir);
//   }

//   console.log('未发现electron32位，开始尝试下载');
//   let url = 'https://npm.taobao.org/mirrors/electron/6.1.7/electron-v6.1.7-win32-ia32.zip';
//   let target = path.join(__dirname, '../additional/electron32.zip');
//   let targetSize = 58124960;

//   if (fs.existsSync(target)) {
//     fs.removeSync(target);
//   }

//   let promise = new Promise(async (resolve, reject) => {
//     console.log('开始下载');
//     let res = await axios.get(url, {
//       responseType: 'stream'
//     });
//     let targetStream = fs.createWriteStream(target);
//     res.data.pipe(targetStream);
//     res.data.on('end', () => {
//       resolve();
//     });
//     res.data.on('error', (e) => {
//       reject(e);
//     });
//   });

//   await promise;

//   let stat = fs.statSync(target);
//   console.log(stat.size, targetSize);
//   if (stat.size !== targetSize) {
//     throw new Error('下载未完成');
//   }

//   let promise2 = new Promise((resolve, reject) => {
//     console.log('下载完成， 开始解压');
//     let zipStream = fs.createReadStream(target);
//     let outStream = unzipper.Extract({
//       path: win32Dir
//     });

//     zipStream.pipe(outStream);
//     zipStream.on('end', () => {
//       resolve();
//     });
//     zipStream.on('error', () => {
//       reject();
//     });
//   });

//   await promise2;
//   console.log('electron 32位完成完成');
// };

const run = async () => {
  Promise.all([
    // startComponent(),
    startRenderer(),
    startMain(),
  ])
    .then(startElectron)
    .catch((err) => {
      console.error(err);
    });
};

run();
