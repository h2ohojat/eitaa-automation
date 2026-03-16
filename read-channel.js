const { chromium } = require('playwright');
const { SESSION_DIR } = require('./core/paths');

(async () => {
    console.log('📡 شروع ماژول خواندن پیام‌ها...');

    const userDataDir = SESSION_DIR;

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: null,
        args: ['--start-maximized'],
    });

    const page = context.pages().length > 0
        ? context.pages()[0]
        : await context.newPage();

    console.log('🌐 در حال ورود به ایتا وب...');
    await page.goto('https://web.eitaa.com/', { timeout: 60000 });

    console.log('⏳ منتظر لود شدن اکانت...');
    await page.waitForTimeout(8000);

    console.log('➡️ هدایت به سمت کانال pyamooz...');
    await page.goto('https://web.eitaa.com/#@pyamooz');
    
    console.log('⏳ در حال بارگذاری پیام‌های کانال...');
    await page.waitForTimeout(6000);

    /**
     * استخراج Message IDها (نسخه هوشمند و چندگانه)
     */
    console.log('🔍 در حال اسکن کدهای صفحه برای پیدا کردن آیدی پیام‌ها...');
    const messageIds = await page.evaluate(() => {
        const ids = new Set(); // استفاده از Set برای جلوگیری از آیدی‌های تکراری
        
        // پیدا کردن تمام المان‌هایی که ممکن است پیام باشند
        const elements = document.querySelectorAll(
            '[data-message-id], [data-msg-id], [data-mid], div[id^="message"], .message, .im_message_wrap'
        );

        elements.forEach(el => {
            // چک کردن ویژگی‌های مختلف که ایتا ممکن است استفاده کرده باشد
            let id = el.getAttribute('data-message-id') || 
                     el.getAttribute('data-msg-id') || 
                     el.getAttribute('data-mid');

            // اگر آیدی در ویژگی‌ها نبود، شاید در خود ویژگی id باشد (مثل id="message117")
            if (!id && el.id && el.id.match(/\d+/)) {
                id = el.id.match(/\d+/)[0];
            }

            // اگر آیدی پیدا شد و عدد بود، آن را به لیست اضافه کن
            if (id && !isNaN(Number(id))) {
                ids.add(Number(id));
            }
        });

        return Array.from(ids).sort((a, b) => a - b);
    });

    if (messageIds.length === 0) {
        console.log('⚠️ اخطار: پیام‌ها روی صفحه هستند اما برچسب ID آن‌ها شناسایی نشد!');
        console.log('💡 راهکار: باید یک پیام را Inspect کنیم تا ببینیم ایتا چه اسمی روی آن گذاشته است.');
    } else {
        console.log('\n✅ Message ID های پیدا شده در صفحه:');
        console.log(messageIds);
        console.log(`📌 آخرین پیام کانال (بزرگترین ID): ${messageIds[messageIds.length - 1]}`);
    }

    console.log('\n✅ تست تمام شد.');
})();
