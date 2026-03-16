/**
 * ═══════════════════════════════════════════════════════════════
 *  سرور داشبورد وب - سیستم اتوماسیون ایتا
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { attachSocket } = require('../logger');
const {
  ADMINS_FILE,
  CONFIG_FILE,
  LOGS_DIR,
  SESSION_DIR,
  PROJECT_ROOT
} = require('../core/paths');
const { preflight } = require('../core/preflight');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

attachSocket(io);

// بهتر برای آینده (قابل override با env)
const PORT = process.env.PORT || 3000;

// وضعیت اجرای auto-forward
let forwardProcess = null;
let isForwardRunning = false;

// ═══════════════════════════════════════════════════════════════
//  مسیرها
// ═══════════════════════════════════════════════════════════════

const CONFIG_PATH = CONFIG_FILE;
const ADMINS_PATH = ADMINS_FILE;

// ═══════════════════════════════════════════════════════════════
//  تنظیمات Express
// ═══════════════════════════════════════════════════════════════

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
//  API Endpoints
// ═══════════════════════════════════════════════════════════════

app.get('/api/stats', (req, res) => {
  try {
    const pf = preflight();

    const stats = {
      adminsCount: getAdminsCount(),
      logsCount: getLogsCount(),
      session: pf.session,
      channelName: getChannelName(),
      lastReport: getLastReportInfo(),
      forwardRunning: isForwardRunning
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admins', (req, res) => {
  try {
    let content = fs.readFileSync(ADMINS_PATH, 'utf-8');
    content = content.replace(/^\uFEFF/, '');
    const admins = content
      .split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0 && !id.startsWith('#'));
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports', (req, res) => {
  try {
    if (!fs.existsSync(LOGS_DIR)) return res.json([]);

    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const content = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, f), 'utf-8'));
        return {
          fileName: f,
          startTime: content.startTime,
          endTime: content.endTime,
          successful: Array.isArray(content.successful) ? content.successful.length : 0,
          failed: Array.isArray(content.failed) ? content.failed.length : 0,
          total: content.totalAdmins || 0
        };
      })
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/:filename', (req, res) => {
  try {
    const safeFile = path.basename(req.params.filename); // جلوگیری از path traversal
    const fullPath = path.join(LOGS_DIR, safeFile);
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (error) {
    res.status(404).json({ error: 'گزارش پیدا نشد' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  توابع کمکی
// ═══════════════════════════════════════════════════════════════

function getAdminsCount() {
  try {
    let content = fs.readFileSync(ADMINS_PATH, 'utf-8');
    content = content.replace(/^\uFEFF/, '');
    return content
      .split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0 && !id.startsWith('#')).length;
  } catch {
    return 0;
  }
}

function getLogsCount() {
  try {
    if (!fs.existsSync(LOGS_DIR)) return 0;
    return fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.txt')).length;
  } catch {
    return 0;
  }
}

function getChannelName() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return config.sourceChannel || '@نامشخص';
  } catch {
    return '@نامشخص';
  }
}

function getLastReportInfo() {
  try {
    if (!fs.existsSync(LOGS_DIR)) return null;

    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const lastReport = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, files[0]), 'utf-8'));

    return {
      successful: Array.isArray(lastReport.successful) ? lastReport.successful.length : 0,
      failed: Array.isArray(lastReport.failed) ? lastReport.failed.length : 0,
      total: lastReport.totalAdmins || 0,
      endTime: lastReport.endTime || null
    };
  } catch {
    return null;
  }
}

function emitLog(message, type = 'info') {
  io.emit('log', {
    time: new Date().toLocaleTimeString('fa-IR'),
    message,
    type
  });
}

function emitForwardStatus() {
  io.emit('forward-status', { running: isForwardRunning });
}

// ═══════════════════════════════════════════════════════════════
//  Socket.io برای Real-time + Start/Stop
// ═══════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
  console.log(`✅ کاربر جدید به داشبورد متصل شد: ${socket.id}`);

  // وضعیت جاری را همان لحظه بفرست
  socket.emit('forward-status', { running: isForwardRunning });

  socket.on('start-forward', () => {
    if (isForwardRunning) {
      socket.emit('log', {
        time: new Date().toLocaleTimeString('fa-IR'),
        message: '⚠️ عملیات فوروارد در حال اجراست.',
        type: 'warning'
      });
      return;
    }

    isForwardRunning = true;
    emitForwardStatus();

    emitLog('🚀 درخواست شروع عملیات از داشبورد دریافت شد.', 'success');

    // اجرای auto-forward.js از ریشه پروژه
    forwardProcess = spawn(
      process.execPath, // node فعلی (NVM-safe)
      ['auto-forward.js'],
      {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: false
      }
    );

    // خروجی استاندارد
    forwardProcess.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      text.split(/\r?\n/).forEach((line) => {
        const cleaned = line.trim();
        if (cleaned) emitLog(cleaned, 'info');
      });
    });

    // خطاها
    forwardProcess.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      text.split(/\r?\n/).forEach((line) => {
        const cleaned = line.trim();
        if (cleaned) emitLog(cleaned, 'error');
      });
    });

    forwardProcess.on('error', (err) => {
      emitLog(`❌ خطا در اجرای فرآیند: ${err.message}`, 'error');
    });

    forwardProcess.on('close', (code, signal) => {
      emitLog(`✅ عملیات پایان یافت. code=${code ?? 'null'} signal=${signal ?? 'null'}`, 'success');
      isForwardRunning = false;
      forwardProcess = null;
      emitForwardStatus();
    });
  });

  socket.on('stop-forward', () => {
    if (!isForwardRunning || !forwardProcess) {
      socket.emit('log', {
        time: new Date().toLocaleTimeString('fa-IR'),
        message: 'ℹ️ هیچ فرآیند فعالی برای توقف وجود ندارد.',
        type: 'info'
      });
      return;
    }

    emitLog('⛔ درخواست توقف عملیات از داشبورد دریافت شد...', 'warning');

    try {
      // توقف امن
      if (process.platform === 'win32') {
        // روی ویندوز SIGINT همیشه کامل عمل نمی‌کند
        forwardProcess.kill('SIGINT');
        setTimeout(() => {
          if (forwardProcess) {
            try {
              forwardProcess.kill('SIGTERM');
            } catch (_) {}
          }
        }, 3000);
      } else {
        forwardProcess.kill('SIGINT');
      }
    } catch (err) {
      emitLog(`❌ خطا در توقف فرآیند: ${err.message}`, 'error');
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ کاربر از داشبورد خارج شد: ${socket.id}`);
  });
});

// سازگاری با کدهای قبلی (اختیاری)
global.sendLiveLog = (message, type = 'info') => {
  emitLog(message, type);
};

// ═══════════════════════════════════════════════════════════════
//  راه‌اندازی سرور
// ═══════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         🌐 داشبورد وب اتوماسیون ایتا                     ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  🚀 سرور روی پورت ${PORT} در حال اجراست                    ║`);
  console.log(`║  🔗 لینک: http://localhost:${PORT}                        ║`);
  console.log('║  ⏹️  برای توقف: Ctrl + C                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
});





