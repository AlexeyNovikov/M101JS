const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const EventEmitter = require('events');
const chalk = require('chalk');
const { URL } = require('url');

const { loadFileWithCURL, loadAndSaveFileWithCURL } = require('./utils/curlLoader');
const mergeFilesWithFFmpeg = require('./utils/ffmpegBlender');
const { clearCache, clearDir } = require('./utils/cacheUtils');
const { OUTPUT_DIR, CACHE_DIR, CREDENTIALS } = require('./constants');

const requestEmitter = new EventEmitter();
const log = console.log;
const srcUrl = {
  video: '',
  audio: '',
};
let timerId = null;

async function onUrlsFetched(fileName) {
  log('');
  const videoSrc = await loadFileWithCURL(srcUrl.video, 'video');
  const audioSrc = await loadFileWithCURL(srcUrl.audio, 'audio');

  await mergeFilesWithFFmpeg(videoSrc, audioSrc, fileName);
  srcUrl.video = ''; srcUrl.audio = '';
  requestEmitter.emit('files_merged');
  clearCache(videoSrc, audioSrc);
}

async function onSingleUrlFetched(url, headers, fileName) {
  log('');
  await loadAndSaveFileWithCURL(url, headers, fileName);
  requestEmitter.emit('files_merged');
}

function login(form, CREDENTIALS) {
  form.elements.email.value = CREDENTIALS.EMAIL;
  form.elements.password.value = CREDENTIALS.PASSWORD;
  form.elements.submit.click();
}

function requestHandler(request, fileName) {
  const decodedRequest = decodeURIComponent(request.url());
  const requestStr = decodedRequest.search(/mime=\w+\/webm/) !== -1 ? decodedRequest : null;

  if (requestStr) {
    const requestObj = new URL(requestStr);
    const dataLength = requestObj.searchParams.get('clen');
    const mime = requestObj.searchParams.get('mime');
    const type = mime.slice(0, mime.indexOf('/'));

    if (!requestObj.searchParams.get('range')) {
      requestEmitter.emit('single_url_fetched', request.url(), request.headers(), fileName);
      timerId = null;
      return;
    }
    requestObj.searchParams.set('range', `0-${dataLength - 1}`);

    if (type === 'video' && !srcUrl.video) {
      srcUrl.video = requestObj.href;
      if (srcUrl.audio) {
        requestEmitter.emit('urls_fetched', fileName);
        timerId = null;
      }
    }

    if (type === 'audio' && !srcUrl.audio) {
      srcUrl.audio = requestObj.href;
      if (srcUrl.video) {
        requestEmitter.emit('urls_fetched', fileName);
        timerId = null;
      }
    }
  }
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); };

function getName(elem) {
  const name = elem.innerText.trim();
  const lineBreakIdx = name.indexOf('\n');
  const safeName = lineBreakIdx ? name.slice(0, lineBreakIdx) : name;
  return safeName.replace(/[\\/:*?"<>|]/g, '');
}

function load(page, fileName) {
  function removeAllListeners() {
    page.removeAllListeners('request');
    requestEmitter.removeAllListeners('urls_fetched');
    requestEmitter.removeAllListeners('single_url_fetched');
    requestEmitter.removeAllListeners('files_merged');
  }

  return new Promise((resolve) => {
    page.on('request', request => requestHandler(request, fileName));
    requestEmitter.on('urls_fetched', onUrlsFetched);
    requestEmitter.on('single_url_fetched', onSingleUrlFetched);
    requestEmitter.on('files_merged', () => {
      removeAllListeners();
      resolve();
    });

    timerId = setTimeout(() => {
      if (timerId) {
        removeAllListeners();
        resolve();
      }
    }, 5000);
  });
}

clearDir(CACHE_DIR);

puppeteer.launch({ headless: false, slowMo: 200, args: ['about:blank', '--disable-web-security', '--user-data-dir'] }) // --auto-open-devtools-for-tabs
  .then(async browser => {
    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 960, height: 960 });

    await page.goto('https://university.mongodb.com');
    await page.click('[data-target="#login-modal"]');
    await page.$eval('#login_form', login, CREDENTIALS);
    await page.goto('https://university.mongodb.com/course/MongoDB/M101JS/2018_May/chapter/Week_1_Introduction/lesson/5245b269e2d42346975228c9/tab/vertical_69703f99235a');

    await (() => {
      return new Promise((resolve) => {
        // TODO: переделать setTimeout во frame.onload(cb), а то ибонина какая-то
        setTimeout(async () => {
          // используем коллекцию, потому что в ней хранится именно окно (contentWindow),
          // а не DOM-элемент. если выбрать фрейм по имени, то там будет DOM-элемент, а
          // как с ним работать через puppeteer - не ясно.
          const frame = page.mainFrame().childFrames()[0];
          // try { await frame.click('.ytp-play-button[aria-label="Пауза"]'); } catch (err) { log(err) }
          try {
            // так как в одно время показывается только одна менюшка, то таких селекторов достаточно
            await frame.click('.ytp-settings-button');
            await frame.click('.ytp-menuitem:last-child');
            await frame.click('.ytp-menuitem:first-child');
          } catch (err) {
            log(err);
          }
          resolve();
        }, 500);
      });
    })();

    const chapterList = await page.$$('.chapter-list > li');

    async function lessonLoader(lessonList, folderName) {
      for (let i = 0; i < lessonList.length; i++) {
        const selector = `.lesson-list > li:nth-child(${i + 1})`;
        const name = await page.$eval(selector, getName);
        const fileName = path.join(folderName, `/${i + 1}. ${name}.mp4`);

        const fileMatch = fileName.match(/(Week.+)/g);
        log(`Файл ${chalk.blue(fileMatch && fileMatch[0])}`);

        if (!fs.existsSync(fileName)) {
          await page.click(selector);
          await load(page, fileName);
        } else {
          log(`${chalk.cyan('уже скачан')}`);
        }
      }
    }

    async function chapterLoader(chapterList) {
      for (let i = 0; i < chapterList.length; i++) {
        const selector = `.chapter-list > li:nth-child(${i + 1})`;
        const name = await page.$eval(selector, getName);
        const folderName = path.join(OUTPUT_DIR, `/${name}`);
        if (!fs.existsSync(folderName)) fs.mkdirSync(folderName);

        await page.click(selector);
        await wait(500);

        const lessonList = await page.$$('.lesson-list > li');
        await lessonLoader(lessonList, folderName);
      }
    }

    chapterLoader(chapterList);
  });
