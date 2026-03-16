/**
 * ═══════════════════════════════════════════════════════════════
 *  داشبورد مرکزی سیستم اتوماسیون ایتا
 *  نسخه: 1.0.0
 * ═══════════════════════════════════════════════════════════════
 */

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const {
    ADMINS_FILE,
    CONFIG_FILE,
    LOGS_DIR,
    SESSION_DIR
} = require('./core/paths');

// ═══════════════════════════════════════════════════════════════
//  تنظیمات و متغیرهای سراسری
// ═══════════════════════════════════════════════════════════════

const VERSION = '1.0.0';
const CONFIG_PATH = CONFIG_FILE;
const ADMINS_PATH = ADMINS_FILE;

// رنگ‌ها برای ترمینال
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgRed: '\x1b[41m'
};

// ═══════════════════════════════════════════════════════════════
//  توابع کمکی
// ═══════════════════════════════════════════════════════════════

function clearScreen() {
    console.clear();
}

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function getAdminsCount() {
    try {
        let content = fs.readFileSync(ADMINS_PATH, 'utf-8');
        content = content.replace(/^\uFEFF/, '');
        const admins = content.split('\n')
            .map(id => id.trim())
            .filter(id => id.length > 0 && !id.startsWith('#'));
        return admins.length;
    } catch {
        return 0;
    }
}

function getLogsCount() {
    try {
        const files = fs.readdirSync(LOGS_DIR);
        return files.filter(f => f.endsWith('.txt')).length;
    } catch {
        return 0;
    }
}

function getSessionStatus() {
    return fs.existsSync(SESSION_DIR) ? '✅ فعال' : '❌ ندارد';
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
        const files = fs.readdirSync(LOGS_DIR)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse();
        
        if (files.length === 0) return { status: '---', time: '---', successful: 0, failed: 0 };
        
        const lastReport = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, files[0]), 'utf-8'));
        const endTime = new Date(lastReport.endTime);
        
        return {
            status: lastReport.failed.length === 0 ? '✅ موفق' : '⚠️ با خطا',
            time: endTime.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            date: endTime.toLocaleDateString('fa-IR'),
            successful: lastReport.successful.length,
            failed: lastReport.failed.length,
            total: lastReport.totalAdmins,
            fileName: files[0]
        };
    } catch {
        return { status: '---', time: '---', successful: 0, failed: 0 };
    }
}

function getCurrentTime() {
    return new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function getCurrentDate() {
    return new Date().toLocaleDateString('fa-IR');
}

// ═══════════════════════════════════════════════════════════════
//  رسم داشبورد
// ═══════════════════════════════════════════════════════════════

function drawDashboard() {
    clearScreen();
    
    const adminsCount = getAdminsCount();
    const logsCount = getLogsCount();
    const sessionStatus = getSessionStatus();
    const channelName = getChannelName();
    const lastReport = getLastReportInfo();
    const currentTime = getCurrentTime();
    const currentDate = getCurrentDate();

    console.log(colorize(`
╔═══════════════════════════════════════════════════════════════════════╗
║              🤖 سیستم اتوماسیون ایتا - نسخه ${VERSION}                   ║
╠═══════════════════════════════════════════════════════════════════════╣
║  📅 ${currentDate}                                        🕐 ${currentTime}   ║
╠═══════════════════════════════════════════════════════════════════════╣`, 'cyan'));

    console.log(colorize(`║  📊 آمار کلی                                                          ║`, 'yellow'));
    console.log(`║  ┌─────────────────────────────────────────────────────────────────┐  ║`);
    console.log(`║  │  👥 ادمین‌ها: ${String(adminsCount).padEnd(6)} نفر   │  📢 کانال: ${channelName.padEnd(15)}      │  ║`);
    console.log(`║  │  📁 گزارش‌ها: ${String(logsCount).padEnd(6)} فایل  │  💾 Session: ${sessionStatus.padEnd(12)}   │  ║`);
    console.log(`║  └─────────────────────────────────────────────────────────────────┘  ║`);

    console.log(colorize(`╠═══════════════════════════════════════════════════════════════════════╣`, 'cyan'));
    
    if (lastReport.status !== '---') {
        console.log(colorize(`║  📈 آخرین اجرا                                                        ║`, 'yellow'));
        console.log(`║  ┌─────────────────────────────────────────────────────────────────┐  ║`);
        console.log(`║  │  وضعیت: ${lastReport.status.padEnd(10)}  │  ✅ موفق: ${String(lastReport.successful).padEnd(4)} │  ❌ خطا: ${String(lastReport.failed).padEnd(4)} │  ║`);
        console.log(`║  │  تاریخ: ${lastReport.date}      │  ساعت: ${lastReport.time}                      │  ║`);
        console.log(`║  └─────────────────────────────────────────────────────────────────┘  ║`);
        console.log(colorize(`╠═══════════════════════════════════════════════════════════════════════╣`, 'cyan'));
    }

    console.log(colorize(`║  📋 منوی اصلی                                                         ║`, 'green'));
    console.log(`║                                                                       ║`);
    console.log(`║    ${colorize('[1]', 'bright')} 🔐 لاگین و ذخیره Session                                      ║`);
    console.log(`║    ${colorize('[2]', 'bright')} 🧪 تست فوروارد (پیام‌های ذخیره شده)                            ║`);
    console.log(`║    ${colorize('[3]', 'bright')} 📖 خواندن پیام‌های کانال                                       ║`);
    console.log(`║    ${colorize('[4]', 'bright')} 🚀 اجرای فوروارد گروهی                                        ║`);
    console.log(`║    ${colorize('[5]', 'bright')} 📊 مشاهده آخرین گزارش                                         ║`);
    console.log(`║    ${colorize('[6]', 'bright')} 📝 ویرایش لیست ادمین‌ها                                        ║`);
    console.log(`║    ${colorize('[7]', 'bright')} ⚙️  مشاهده تنظیمات                                             ║`);
    console.log(`║    ${colorize('[0]', 'bright')} ❌ خروج                                                        ║`);
    console.log(`║                                                                       ║`);
    console.log(colorize(`╚═══════════════════════════════════════════════════════════════════════╝`, 'cyan'));
    console.log('');
}

// ═══════════════════════════════════════════════════════════════
//  اجرای ماژول‌ها
// ═══════════════════════════════════════════════════════════════

function runModule(moduleName, displayName) {
    return new Promise((resolve) => {
        clearScreen();
        console.log(colorize(`\n🚀 در حال اجرای ${displayName}...\n`, 'green'));
        console.log(colorize('═'.repeat(60), 'dim'));
        console.log('');

        const child = spawn('node', [moduleName], {
            cwd: __dirname,
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            console.log('');
            console.log(colorize('═'.repeat(60), 'dim'));
            if (code === 0) {
                console.log(colorize(`\n✅ ${displayName} با موفقیت به پایان رسید.`, 'green'));
            } else {
                console.log(colorize(`\n⚠️ ${displayName} با کد ${code} خاتمه یافت.`, 'yellow'));
            }
            console.log(colorize('\n👉 برای بازگشت به منو، Enter را فشار دهید...', 'dim'));
            
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            rl.question('', () => {
                rl.close();
                resolve();
            });
        });
    });
}

// ═══════════════════════════════════════════════════════════════
//  نمایش گزارش
// ═══════════════════════════════════════════════════════════════

function showLastReport() {
    clearScreen();
    console.log(colorize('\n📊 آخرین گزارش عملیات\n', 'cyan'));
    console.log(colorize('═'.repeat(60), 'dim'));

    const lastReport = getLastReportInfo();
    
    if (lastReport.status === '---') {
        console.log(colorize('\n⚠️ هیچ گزارشی یافت نشد!\n', 'yellow'));
    } else {
        try {
            const reportContent = fs.readFileSync(
                path.join(LOGS_DIR, lastReport.fileName.replace('.json', '.txt')), 
                'utf-8'
            );
            console.log(reportContent);
        } catch {
            console.log(colorize('\n❌ خطا در خواندن فایل گزارش!\n', 'red'));
        }
    }

    console.log(colorize('═'.repeat(60), 'dim'));
}

// ═══════════════════════════════════════════════════════════════
//  نمایش لیست ادمین‌ها
// ═══════════════════════════════════════════════════════════════

function showAdminsList() {
    clearScreen();
    console.log(colorize('\n📝 لیست ادمین‌ها\n', 'cyan'));
    console.log(colorize('═'.repeat(60), 'dim'));

    try {
        let content = fs.readFileSync(ADMINS_PATH, 'utf-8');
        content = content.replace(/^\uFEFF/, '');
        const admins = content.split('\n')
            .map(id => id.trim())
            .filter(id => id.length > 0);
        
        admins.forEach((admin, index) => {
            const prefix = admin.startsWith('#') ? colorize('💬', 'dim') : colorize('👤', 'green');
            console.log(`  ${prefix} ${index + 1}. ${admin}`);
        });

        console.log('');
        console.log(colorize(`📊 مجموع: ${admins.filter(a => !a.startsWith('#')).length} ادمین فعال`, 'yellow'));
        console.log(colorize(`💡 برای ویرایش، فایل admins.txt را باز کنید.`, 'dim'));
        
    } catch {
        console.log(colorize('\n❌ فایل admins.txt یافت نشد!\n', 'red'));
    }

    console.log(colorize('\n' + '═'.repeat(60), 'dim'));
}

// ═══════════════════════════════════════════════════════════════
//  نمایش تنظیمات
// ═══════════════════════════════════════════════════════════════

function showConfig() {
    clearScreen();
    console.log(colorize('\n⚙️ تنظیمات فعلی\n', 'cyan'));
    console.log(colorize('═'.repeat(60), 'dim'));

    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        
        console.log(colorize('\n📢 کانال مبدا:', 'yellow'));
        console.log(`   ${config.sourceChannel}`);
        
        console.log(colorize('\n⏱️ تاخیرها (میلی‌ثانیه):', 'yellow'));
        Object.entries(config.delays).forEach(([key, value]) => {
            console.log(`   • ${key}: ${value}`);
        });
        
        console.log(colorize('\n🌐 مرورگر:', 'yellow'));
        console.log(`   • headless: ${config.browser.headless}`);
        console.log(`   • channel: ${config.browser.channel}`);
        
        console.log(colorize('\n🔄 تلاش مجدد:', 'yellow'));
        console.log(`   • حداکثر تلاش: ${config.retry.maxAttempts}`);
        console.log(`   • تاخیر بین تلاش‌ها: ${config.retry.delayBetweenRetries}ms`);
        
        console.log(colorize('\n🐛 دیباگ:', 'yellow'));
        console.log(`   • نقطه قرمز: ${config.debug.showRedDot ? '✅ فعال' : '❌ غیرفعال'}`);
        console.log(`   • لاگ جزئی: ${config.debug.verboseLog ? '✅ فعال' : '❌ غیرفعال'}`);
        
        console.log(colorize('\n💡 برای ویرایش، فایل config.json را باز کنید.', 'dim'));
        
    } catch {
        console.log(colorize('\n❌ فایل config.json یافت نشد!\n', 'red'));
    }

    console.log(colorize('\n' + '═'.repeat(60), 'dim'));
}

// ═══════════════════════════════════════════════════════════════
//  حلقه اصلی برنامه
// ═══════════════════════════════════════════════════════════════

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

    let running = true;

    while (running) {
        drawDashboard();
        
        const choice = await question(colorize('👉 گزینه مورد نظر را وارد کنید: ', 'bright'));

        switch (choice.trim()) {
            case '1':
                await runModule('login.js', 'ماژول لاگین');
                break;
            
            case '2':
                await runModule('forward-test.js', 'تست فوروارد');
                break;
            
            case '3':
                await runModule('read-channel.js', 'خواندن پیام‌های کانال');
                break;
            
            case '4':
                console.log(colorize('\n⚠️ توجه: این عملیات برای همه ادمین‌های لیست اجرا می‌شود!', 'yellow'));
                const confirm = await question(colorize('آیا مطمئن هستید؟ (y/n): ', 'yellow'));
                if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
                    await runModule('auto-forward.js', 'فوروارد گروهی');
                }
                break;
            
            case '5':
                showLastReport();
                await question(colorize('\n👉 برای بازگشت Enter را فشار دهید...', 'dim'));
                break;
            
            case '6':
                showAdminsList();
                await question(colorize('\n👉 برای بازگشت Enter را فشار دهید...', 'dim'));
                break;
            
            case '7':
                showConfig();
                await question(colorize('\n👉 برای بازگشت Enter را فشار دهید...', 'dim'));
                break;
            
            case '0':
            case 'q':
            case 'exit':
                running = false;
                clearScreen();
                console.log(colorize('\n👋 خداحافظ! به امید دیدار.\n', 'cyan'));
                break;
            
            default:
                console.log(colorize('\n❌ گزینه نامعتبر! لطفاً عدد ۰ تا ۷ وارد کنید.', 'red'));
                await new Promise(r => setTimeout(r, 1500));
        }
    }

    rl.close();
    process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
//  شروع برنامه
// ═══════════════════════════════════════════════════════════════

main().catch(console.error);
