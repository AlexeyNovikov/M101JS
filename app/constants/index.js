const fs = require('fs');
const path = require('path');

const HOME_DIR = path.join(process.env.HOME, '/Desktop', '/m101js');
if (!fs.existsSync(HOME_DIR)) fs.mkdirSync(HOME_DIR);

const CACHE_DIR = path.join(HOME_DIR, '/cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);

const OUTPUT_DIR = path.join(HOME_DIR, '/output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const CREDENTIALS = {
  EMAIL: '',
  PASSWORD: '',
};

module.exports.HOME_DIR = HOME_DIR;
module.exports.CACHE_DIR = CACHE_DIR;
module.exports.OUTPUT_DIR = OUTPUT_DIR;
module.exports.CREDENTIALS = CREDENTIALS;
