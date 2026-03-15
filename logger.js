const fs = require('fs');

let ioRef = null;

function attachSocket(io) {
  ioRef = io;
}

function log(message, type = 'info') {
  const time = new Date().toLocaleTimeString('fa-IR');
  const line = `[${time}] ${message}`;

  // Console
  console.log(line);

  // File
  try {
    if (global.LOG_FILE_PATH) {
      fs.appendFileSync(global.LOG_FILE_PATH, line + '\n', 'utf8');
    }
  } catch (_) {}

  // Live Dashboard
  if (ioRef) {
    ioRef.emit('log', { time, message, type });
  }
}

module.exports = {
  attachSocket,
  log
};