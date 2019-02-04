const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const { spawn } = require('child_process');

function getSeconds(arr) {
  return Math.round(
    (parseInt(arr[0]) * 60 * 60) +
    (parseInt(arr[1]) * 60) +
    (parseFloat(arr[2]))
  );
};

function mergeFilesWithFFmpeg(videoSrc, audioSrc, fileName) {
  return new Promise((resolve) => {
    const ffmpeg = spawn(
      'ffmpeg',
      ['-i', videoSrc, '-i', audioSrc, '-vcodec', 'libx264', '-qscale:a', 5, fileName, '-loglevel', 'verbose']
    );
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let duration = 0;

    ffmpeg.stdio[2].on('data', (data) => {
      const dataStr = data.toString();

      if (dataStr.includes('[y/N]')) {
        ffmpeg.stdio[0].write('y\n', 'utf-8');
      }

      const durationData = dataStr.match(/Duration:.*(\d{2}:\d{2}:\d{2}\.\d{2})/);
      if (durationData) {
        duration = getSeconds(durationData[1].split(':'));
      }

      const frameData = dataStr.match(/frame=.+(\d{2}:\d{2}:\d{2}\.\d{2})/);
      if (frameData) {
        const seconds = getSeconds(frameData[1].split(':'));
        const processed = Math.round(seconds / duration * 100);

        readline.moveCursor(process.stdout, 0, -1);
        readline.clearLine(process.stdout, 0);
        rl.write(`Слияние файлов: ${chalk.green(processed)}${chalk.green('%')}\n`);
      }
    });

    ffmpeg.on('close', (code) => {
      rl.close();

      resolve();

      if (code) {
        console.log(`ffmpeg child process exited with code ${code}`);
      } else {
        console.log('');
      }
    });
  });
}

module.exports = mergeFilesWithFFmpeg;
