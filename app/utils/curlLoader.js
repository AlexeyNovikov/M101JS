const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const { spawn } = require('child_process');

const { CACHE_DIR } = require('../constants');

const fileType = {
  audio: 'аудиофайла',
  video: 'видеофайла',
}

function loadFileWithCURL(href, type) {
  return new Promise((resolve) => {
    const curl = spawn('curl', [`${href}`, '--compressed', '--progress-bar']);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const targetSrc = path.join(CACHE_DIR, `${type}${Number(new Date())}.webm`);
    let data = [];

    curl.stdio[1].on('data', (chunk) => {
      data.push(chunk);
    });

    curl.stdio[2].on('data', (data) => {
      const dataStr = data.toString();
      const percentage = dataStr.match(/\d+,\d%/);

      if (percentage) {
        readline.moveCursor(process.stdout, 0, -1);
        readline.clearLine(process.stdout, 0);
        rl.write(`Загрузка ${fileType[type]}: ${chalk.magenta.bold(percentage[0])}\n`);
      }
    });

    curl.on('close', (code) => {
      rl.close();
      fs.writeFileSync(targetSrc, Buffer.concat(data));

      resolve(targetSrc);

      if (code) {
        console.log(`curl child process exited with code ${code}`);
      } else {
        console.log('');
      }
    });
  });
}

function loadAndSaveFileWithCURL(url, headers, fileName) {
  return new Promise((resolve) => {
    const params = [];
    Object.entries(headers).forEach((entry) => {
      params.push('-H');
      params.push(`${entry[0]}: ${entry[1]}`);
    });

    const curl = spawn('curl', [`${url}`, '--compressed', '--progress-bar', ...params]);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    let data = [];

    curl.stdio[1].on('data', (chunk) => {
      data.push(chunk);
    });

    curl.stdio[2].on('data', (data) => {
      const dataStr = data.toString();
      const percentage = dataStr.match(/\d+,\d%/);

      if (percentage) {
        readline.moveCursor(process.stdout, 0, -1);
        readline.clearLine(process.stdout, 0);
        rl.write(`Загрузка единого файла: ${chalk.magenta.bold(percentage[0])}\n`);
      }
    });

    curl.on('close', (code) => {
      rl.close();
      fs.writeFileSync(fileName, Buffer.concat(data));

      resolve();

      if (code) {
        console.log(`curl child process exited with code ${code}`);
      } else {
        console.log('');
      }
    });
  });
}

module.exports.loadFileWithCURL = loadFileWithCURL;
module.exports.loadAndSaveFileWithCURL = loadAndSaveFileWithCURL;
