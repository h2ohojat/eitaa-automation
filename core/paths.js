const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const ADMINS_FILE = path.join(PROJECT_ROOT, 'admins.txt');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'config.json');
const SESSION_DIR = path.join(PROJECT_ROOT, 'eitaa-session');
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs');

module.exports = {
  PROJECT_ROOT,
  ADMINS_FILE,
  CONFIG_FILE,
  SESSION_DIR,
  LOGS_DIR
};
