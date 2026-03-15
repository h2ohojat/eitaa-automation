/**
 * ═══════════════════════════════════════════════════════════════
 *  سیستم اتوماسیون فوروارد ایتا - نسخه Production 1.0
 *  تاریخ: اسفند ۱۴۰۴
 * ═══════════════════════════════════════════════════════════════
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { log } = require('./logger'); // ✅ لاگر مرکزی

// ═══════════════════════════════════════════════════════════════
//  بخش ۱: بارگذاری تنظیمات از فایل config.json
// ═══════════════════════════════════════════════════════════════

const configPath = path.join(__dirname, 'config.json');
let config;

try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configContent);
    console.log('⚙️  تنظیمات از فایل config.json بارگذاری شد.');
} catch (error) {
    console.error('❌ خطا: فایل config.json پیدا نشد یا فرمت آن اشتباه است!');
    console.log('💡 راهنما: یک فایل config.json در کنار برنامه بسازید.');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
//  بخش ۲: بارگذاری لیست ادمین‌ها از فایل admins.txt
// ═══════════════════════════════════════════════════════════════

const adminsFilePath = path.join(__dirname, 'admins.txt');
let targetAdmins = [];

try {
    let fileContent = fs.readFileSync(adminsFilePath, 'utf-8');
    fileContent = fileContent.replace(/^\uFEFF/, ''); // حذف BOM ویندوز
    
    targetAdmins = fileContent.split('\n')
        .map(id => id.trim())
        .filter(id => id.length > 0 && !id.startsWith('#')); // خطوط خالی و کامنت‌ها را نادیده بگیر
    
    console.log(`📂 فایل ادمین‌ها خوانده شد. تعداد: ${targetAdmins.length} نفر`);
    
    if (config.debug.verboseLog) {
        console.log('📋 لیست آیدی‌ها:', targetAdmins);
    }
} catch (error) {
    console.error('❌ خطا: فایل admins.txt پیدا نشد!');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
//  بخش ۳: سیستم گزارش‌گیری (Logging)
// ═══════════════════════════════════════════════════════════════

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
    console.log('📁 پوشه logs ساخته شد.');
}

// ساخت نام فایل گزارش بر اساس تاریخ و ساعت
const now = new Date();
const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
const reportPath = path.join(logsDir, `report-${timestamp}.txt`);
const reportJsonPath = path.join(logsDir, `report-${timestamp}.json`);

// ✅ مسیر فایل گزارش را به logger مرکزی معرفی می‌کنیم
global.LOG_FILE_PATH = reportPath;

// آبجکت ذخیره نتایج
const report = {
    startTime: now.toISOString(),
    endTime: null,
    sourceChannel: config.sourceChannel,
    totalAdmins: targetAdmins.length,
    successful: [],
    failed: [],
    skipped: []
};

// تابع نوشتن لاگ (سازگار با کد قبلی)
function writeLog(message, type = 'info') {
    log(message, type);
}

// ═══════════════════════════════════════════════════════════════
//  بخش ۴: توابع کمکی
// ═══════════════════════════════════════════════════════════════

// تابع تاخیر تصادفی
function getRandomDelay() {
    const min = config.delays.betweenMessagesMin;
    const max = config.delays.betweenMessagesMax;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// تابع نمایش پیشرفت
function showProgress(current, total, adminId, status) {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    console.log(`\n[${bar}] ${percent}% (${current}/${total})`);
    console.log(`👤 ${adminId} - ${status}`);
}

// تابع تلاش مجدد
async function retryOperation(operation, operationName, maxAttempts = config.retry.maxAttempts) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            writeLog(`⚠️  تلاش ${attempt}/${maxAttempts} برای ${operationName} ناموفق: ${error.message}`, 'warning');
            if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, config.retry.delayBetweenRetries));
            } else {
                throw error;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  بخش ۵: منطق اصلی برنامه
// ═══════════════════════════════════════════════════════════════

(async () => {
    if (targetAdmins.length === 0) {
        writeLog('⚠️  فایل admins.txt خالی است.', 'warning');
        return;
    }

    writeLog('═══════════════════════════════════════════════════════════');
    writeLog('🚀 شروع سیستم اتوماسیون فوروارد ایتا', 'info');
    writeLog(`📅 تاریخ: ${now.toLocaleDateString('fa-IR')} - ساعت: ${now.toLocaleTimeString('fa-IR')}`);
    writeLog(`📢 کانال مبدا: ${config.sourceChannel}`);
    writeLog(`👥 تعداد مخاطبین: ${targetAdmins.length} نفر`);
    writeLog('═══════════════════════════════════════════════════════════');

    const userDataDir = path.join(__dirname, 'eitaa-session');
    let context;
    let page;

    try {
        // باز کردن مرورگر
        writeLog('🌐 در حال باز کردن مرورگر...');
        context = await chromium.launchPersistentContext(userDataDir, {
            headless: config.browser.headless,
            channel: config.browser.channel,
            viewport: null,
            args: ['--start-maximized'],
        });

        page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    } catch (error) {
        writeLog(`❌ خطای بحرانی در باز کردن مرورگر: ${error.message}`, 'error');
        process.exit(1);
    }

    // حلقه اصلی ارسال پیام
    for (let i = 0; i < targetAdmins.length; i++) {
        const adminId = targetAdmins[i];
        const currentNumber = i + 1;

        showProgress(currentNumber, targetAdmins.length, adminId, '⏳ در حال پردازش...');
        writeLog(`\n────────────────────────────────────────`);
        writeLog(`👤 شروع عملیات برای: ${adminId} (${currentNumber}/${targetAdmins.length})`);

        try {
            // ۱. رفتن به کانال مبدا
            await retryOperation(async () => {
                writeLog('🌐 ورود به کانال مبدا...');
                await page.goto(`https://web.eitaa.com/#${config.sourceChannel}`, { timeout: 60000 });
                await page.waitForTimeout(config.delays.pageLoad);
            }, 'ورود به کانال');

            // ۲. پیدا کردن آخرین پیام
            const messages = page.locator('.message');
            const count = await messages.count();
            
            if (count === 0) {
                writeLog(`⚠️  هیچ پیامی در کانال پیدا نشد!`, 'warning');
                report.skipped.push({ id: adminId, reason: 'پیامی در کانال نیست' });
                continue;
            }

            const lastMessage = messages.nth(count - 1);
            await lastMessage.scrollIntoViewIfNeeded();
            await page.waitForTimeout(1000);

            // ۳. کلیک راست روی پیام
            writeLog('🖱️  کلیک راست روی آخرین پیام...');
            await lastMessage.click({ button: 'right', position: { x: 50, y: 50 } });
            await page.waitForTimeout(config.delays.afterRightClick);

            // ۴. کلیک روی دکمه هدایت
            writeLog('➡️  جستجوی دکمه هدایت...');
            const menuItems = page.locator('.btn-menu-item');
            const menuCount = await menuItems.count();
            let isForwardClicked = false;

            for (let j = 0; j < menuCount; j++) {
                const item = menuItems.nth(j);
                const isHidden = await item.evaluate(el => el.classList.contains('hide'));
                if (isHidden) continue;

                const text = await item.innerText();
                if (text && text.trim() === 'هدایت') {
                    await item.click();
                    isForwardClicked = true;
                    writeLog('✅ دکمه هدایت کلیک شد.', 'success');
                    break;
                }
            }

            if (!isForwardClicked) {
                writeLog(`❌ دکمه هدایت پیدا نشد!`, 'error');
                report.failed.push({ id: adminId, reason: 'دکمه هدایت پیدا نشد' });
                continue;
            }
            await page.waitForTimeout(config.delays.afterForwardClick);

            // ۵. جستجوی آیدی
            writeLog(`🔍 جستجوی آیدی: ${adminId}...`);
            const searchInput = page.locator('input[type="text"]').last();
            
            await searchInput.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await page.keyboard.type(adminId, { delay: 150 });
            await page.waitForTimeout(config.delays.searchWait);

            // ۶. کلیک روی نتیجه جستجو
            writeLog('🎯 هدف‌گیری نتیجه جستجو...');
            const box = await searchInput.boundingBox();

            if (!box) {
                writeLog(`❌ کادر جستجو پیدا نشد!`, 'error');
                report.failed.push({ id: adminId, reason: 'کادر جستجو پیدا نشد' });
                continue;
            }

            const targetX = box.x + (box.width / 2);
            const targetY = box.y + box.height + 55;

            // نمایش نقطه قرمز (اگر در تنظیمات فعال باشد)
            if (config.debug.showRedDot) {
                await page.evaluate(({x, y}) => {
                    const dot = document.createElement('div');
                    dot.style.cssText = `
                        position: absolute;
                        left: ${x}px;
                        top: ${y}px;
                        width: 20px;
                        height: 20px;
                        background-color: red;
                        border-radius: 50%;
                        z-index: 999999;
                        transform: translate(-50%, -50%);
                        pointer-events: none;
                    `;
                    document.body.appendChild(dot);
                    setTimeout(() => dot.remove(), 2000);
                }, {x: targetX, y: targetY});
            }

            await page.waitForTimeout(config.delays.beforeClick);
            await page.mouse.move(targetX, targetY);
            await page.mouse.down();
            await page.waitForTimeout(100);
            await page.mouse.up();
            writeLog('✅ روی مخاطب کلیک شد.', 'success');

            // ۷. ارسال نهایی
            await page.waitForTimeout(config.delays.afterSelectContact);
            writeLog('🚀 ارسال پیام...');
            await page.keyboard.press('Enter');

            // ۸. بررسی موفقیت ارسال
            await page.waitForTimeout(2000);
            
            // چک کردن اینکه آیا هنوز در پاپ‌آپ هستیم یا وارد چت شدیم
            const stillInPopup = await page.locator('.popup-forward').count();
            
            if (stillInPopup > 0) {
                writeLog(`⚠️  احتمالاً آیدی ${adminId} پیدا نشد یا خطایی رخ داد.`, 'warning');
                report.failed.push({ id: adminId, reason: 'مخاطب پیدا نشد یا خطا در ارسال' });
                // بستن پاپ‌آپ
                await page.keyboard.press('Escape');
                await page.waitForTimeout(1000);
            } else {
                writeLog(`✅ پیام برای ${adminId} با موفقیت ارسال شد!`, 'success');
                report.successful.push(adminId);
            }

            // ۹. استراحت بین ارسال‌ها
            if (i < targetAdmins.length - 1) {
                const delay = getRandomDelay();
                writeLog(`⏳ استراحت ${(delay/1000).toFixed(1)} ثانیه...`);
                await page.waitForTimeout(delay);
            }

        } catch (error) {
            writeLog(`❌ خطا در پردازش ${adminId}: ${error.message}`, 'error');
            report.failed.push({ id: adminId, reason: error.message });
            
            // تلاش برای بازیابی و ادامه
            try {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(2000);
            } catch (e) {
                // نادیده گرفتن خطای بازیابی
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  بخش ۶: ذخیره گزارش نهایی
    // ═══════════════════════════════════════════════════════════════

    report.endTime = new Date().toISOString();
    
    // ذخیره گزارش JSON
    fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), 'utf-8');

    // نوشتن خلاصه در فایل متنی
    writeLog('\n═══════════════════════════════════════════════════════════');
    writeLog('📊 گزارش نهایی عملیات');
    writeLog('═══════════════════════════════════════════════════════════');
    writeLog(`✅ موفق: ${report.successful.length} نفر`, 'success');
    writeLog(`❌ ناموفق: ${report.failed.length} نفر`, 'error');
    writeLog(`⏭️  رد شده: ${report.skipped.length} نفر`, 'warning');
    writeLog(`📁 گزارش کامل ذخیره شد: ${reportPath}`);
    
    if (report.failed.length > 0) {
        writeLog('\n📋 لیست ناموفق‌ها:');
        report.failed.forEach(f => {
            writeLog(`   • ${f.id}: ${f.reason}`, 'error');
        });
    }

    writeLog('\n🎉 عملیات به پایان رسید!', 'success');
    writeLog(`⏱️  زمان کل: ${Math.round((new Date() - now) / 1000 / 60)} دقیقه`);

    // بستن مرورگر
    await page.waitForTimeout(config.delays.beforeClose);
    await context.close();
    
    console.log('\n✅ برنامه با موفقیت به پایان رسید.');
})();