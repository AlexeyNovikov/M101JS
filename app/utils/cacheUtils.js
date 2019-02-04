const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const log = console.log;

function clearCache(videoSrc, audioSrc) {
  fs.unlinkSync(videoSrc);
  fs.unlinkSync(audioSrc);
}

function clearDir(dir) {
  const dirContentList = fs.readdirSync(dir);

  dirContentList.forEach((item) => {
    const entity = path.join(dir, item);

    if (fs.statSync(entity).isFile()) {
      fs.unlinkSync(entity);
      log(chalk.blue(`Файл ${chalk.underline(item)} удален!`));
    } else if (fs.statSync(entity).isDirectory()) {
      fs.rmdirSync(entity);
      log(chalk.green(`Папка ${chalk.underline(item)} удалена!`));
    }
  });
}

module.exports.clearCache = clearCache;
module.exports.clearDir = clearDir;
