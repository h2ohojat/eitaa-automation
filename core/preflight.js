const fs = require('fs');
const path = require('path');
const {
  PROJECT_ROOT,
  ADMINS_FILE,
  CONFIG_FILE,
  LOGS_DIR,
  SESSION_DIR
} = require('./paths');

function fileStatus(filePath) {
  const status = {
    path: filePath,
    exists: false,
    readable: false
  };

  try {
    if (fs.existsSync(filePath)) {
      status.exists = true;
      fs.accessSync(filePath, fs.constants.R_OK);
      status.readable = true;
    }
  } catch (_) {
    status.readable = false;
  }

  return status;
}

function dirStatus(dirPath) {
  const status = {
    path: dirPath,
    exists: false,
    readable: false
  };

  try {
    if (fs.existsSync(dirPath)) {
      status.exists = true;
      fs.accessSync(dirPath, fs.constants.R_OK);
      status.readable = true;
    }
  } catch (_) {
    status.readable = false;
  }

  return status;
}

function sessionStatus() {
  const session = dirStatus(SESSION_DIR);
  const localState = path.join(SESSION_DIR, 'Local State');
  const defaultProfile = path.join(SESSION_DIR, 'Default');

  const hasLocalState = fs.existsSync(localState);
  const hasDefaultProfile = fs.existsSync(defaultProfile);

  return {
    ...session,
    hasLocalState,
    hasDefaultProfile,
    looksValid: session.exists && hasLocalState && hasDefaultProfile,
    loggedIn: null
  };
}

function preflight() {
  return {
    projectRoot: PROJECT_ROOT,
    admins: fileStatus(ADMINS_FILE),
    config: fileStatus(CONFIG_FILE),
    logsDir: dirStatus(LOGS_DIR),
    session: sessionStatus()
  };
}

module.exports = {
  preflight
};