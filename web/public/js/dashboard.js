/**
 * ═══════════════════════════════════════════════════════════════
 *  لاجیک داشبورد وب
 * ═══════════════════════════════════════════════════════════════
 */

// اتصال به Socket.io
const socket = io();

// المان‌های DOM
const elements = {
    adminsCount: document.getElementById('admins-count'),
    successfulCount: document.getElementById('successful-count'),
    failedCount: document.getElementById('failed-count'),
    logsCount: document.getElementById('logs-count'),
    channelName: document.getElementById('channel-name'),
    sessionStatus: document.getElementById('session-status'),
    lastUpdate: document.getElementById('last-update'),
    lastStatus: document.getElementById('last-status'),
    lastTime: document.getElementById('last-time'),
    successRate: document.getElementById('success-rate'),
    liveLog: document.getElementById('live-log'),

    // دکمه‌های جدید کنترل
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    refreshBtn: document.getElementById('refreshBtn')
};

// وضعیت اجرای فوروارد
let isForwardRunning = false;

// ═══════════════════════════════════════════════════════════════
//  ابزارهای کمکی
// ═══════════════════════════════════════════════════════════════

function setForwardButtonsState(running) {
    isForwardRunning = !!running;

    if (elements.startBtn) {
        elements.startBtn.disabled = isForwardRunning;
        elements.startBtn.classList.toggle('opacity-50', isForwardRunning);
        elements.startBtn.classList.toggle('cursor-not-allowed', isForwardRunning);
    }

    if (elements.stopBtn) {
        elements.stopBtn.disabled = !isForwardRunning;
        elements.stopBtn.classList.toggle('opacity-50', !isForwardRunning);
        elements.stopBtn.classList.toggle('cursor-not-allowed', !isForwardRunning);
    }
}

function safeText(el, value) {
    if (!el) return;
    el.textContent = value;
}

// ═══════════════════════════════════════════════════════════════
//  دریافت و نمایش آمار
// ═══════════════════════════════════════════════════════════════

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        // بروزرسانی کارت‌ها
        safeText(elements.adminsCount, data.adminsCount ?? 0);
        safeText(elements.logsCount, data.logsCount ?? 0);
        safeText(elements.channelName, data.channelName ?? '@نامشخص');
        safeText(elements.sessionStatus, data.sessionStatus ? '✅ فعال' : '❌ غیرفعال');
        safeText(elements.lastUpdate, new Date().toLocaleTimeString('fa-IR'));

        // وضعیت اجرای عملیات
        setForwardButtonsState(!!data.forwardRunning);

        // اطلاعات آخرین اجرا
        if (data.lastReport) {
            safeText(elements.successfulCount, data.lastReport.successful ?? 0);
            safeText(elements.failedCount, data.lastReport.failed ?? 0);

            const total = data.lastReport.total ?? 0;
            const successful = data.lastReport.successful ?? 0;
            const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

            safeText(elements.successRate, `${successRate}%`);
            safeText(elements.lastStatus, (data.lastReport.failed ?? 0) === 0 ? '✅ موفق' : '⚠️ با خطا');

            if (data.lastReport.endTime) {
                const endTime = new Date(data.lastReport.endTime);
                safeText(elements.lastTime, endTime.toLocaleString('fa-IR'));
            } else {
                safeText(elements.lastTime, '---');
            }
        } else {
            safeText(elements.successfulCount, '0');
            safeText(elements.failedCount, '0');
            safeText(elements.successRate, '---');
            safeText(elements.lastStatus, '---');
            safeText(elements.lastTime, '---');
        }

    } catch (error) {
        console.error('خطا در دریافت آمار:', error);
        addLog('❌ خطا در دریافت آمار از سرور', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
//  مدیریت لاگ زنده
// ═══════════════════════════════════════════════════════════════

function addLog(message, type = 'info', customTime = null) {
    if (!elements.liveLog) return;

    const time = customTime || new Date().toLocaleTimeString('fa-IR');
    const colors = {
        info: 'text-blue-400',
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400'
    };

    const colorClass = colors[type] || colors.info;

    const logEntry = document.createElement('div');
    logEntry.className = `${colorClass} mb-1 leading-6 break-words`;
    logEntry.innerHTML = `<span class="text-gray-500">[${time}]</span> ${message}`;

    elements.liveLog.appendChild(logEntry);
    elements.liveLog.scrollTop = elements.liveLog.scrollHeight;

    // نگه داشتن فقط ۱۰۰ خط آخر
    while (elements.liveLog.children.length > 100) {
        elements.liveLog.removeChild(elements.liveLog.firstChild);
    }
}

// دریافت لاگ‌های زنده از Socket.io
socket.on('log', (data) => {
    // data: { time, message, type }
    addLog(data?.message || '---', data?.type || 'info', data?.time || null);
});

// وضعیت اجرای فوروارد از سرور
socket.on('forward-status', (data) => {
    setForwardButtonsState(!!data?.running);
    addLog(
        data?.running ? '🟢 وضعیت: عملیات در حال اجراست' : '⚪ وضعیت: عملیات متوقف است',
        'info'
    );
});

// ═══════════════════════════════════════════════════════════════
//  دکمه‌های Start / Stop / Refresh
// ═══════════════════════════════════════════════════════════════

if (elements.startBtn) {
    elements.startBtn.addEventListener('click', () => {
        if (isForwardRunning) {
            addLog('⚠️ عملیات در حال اجراست و امکان شروع مجدد نیست.', 'warning');
            return;
        }
        addLog('🚀 درخواست شروع ارسال ثبت شد...', 'success');
        socket.emit('start-forward');
    });
}

if (elements.stopBtn) {
    elements.stopBtn.addEventListener('click', () => {
        if (!isForwardRunning) {
            addLog('ℹ️ هیچ عملیات فعالی برای توقف وجود ندارد.', 'info');
            return;
        }
        addLog('⛔ درخواست توقف عملیات ارسال شد...', 'warning');
        socket.emit('stop-forward');
    });
}

if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', () => {
        addLog('🔄 در حال بروزرسانی اطلاعات...', 'info');
        loadStats();
    });
} else {
    // سازگاری با ساختار قدیمی شما
    const oldRefreshBtn = document.querySelector('button:nth-of-type(3)');
    if (oldRefreshBtn) {
        oldRefreshBtn.addEventListener('click', () => {
            addLog('🔄 در حال بروزرسانی اطلاعات...', 'info');
            loadStats();
        });
    }
}

// ═══════════════════════════════════════════════════════════════
//  بارگذاری اولیه و رفرش خودکار
// ═══════════════════════════════════════════════════════════════

// بارگذاری اولیه
loadStats();
setForwardButtonsState(false);

addLog('✅ داشبورد بارگذاری شد', 'success');
addLog('🔄 اتصال به سرور برقرار است', 'info');

// رفرش خودکار هر ۵ ثانیه
setInterval(loadStats, 5000);

// ═══════════════════════════════════════════════════════════════
//  اتصال Socket.io
// ═══════════════════════════════════════════════════════════════

socket.on('connect', () => {
    addLog('✅ اتصال Socket برقرار شد', 'success');
});

socket.on('disconnect', () => {
    addLog('❌ اتصال Socket قطع شد', 'error');
});