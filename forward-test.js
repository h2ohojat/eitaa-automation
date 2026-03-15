const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log('📡 شروع عملیات فوروارد (نسخه ضد گلوله)...');

    const userDataDir = path.join(__dirname, 'eitaa-session');

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: null,
        args: ['--start-maximized'],
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('🌐 ورود به کانال pyamooz...');
    await page.goto('https://web.eitaa.com/#@pyamooz', { timeout: 60000 });
    
    console.log('⏳ منتظر لود شدن پیام‌ها...');
    await page.waitForTimeout(8000);

    // پیدا کردن آخرین پیام
    const messages = page.locator('.message');
    const count = await messages.count();
    
    if (count === 0) {
        console.log('❌ هیچ پیامی پیدا نشد!');
        return;
    }

    const lastMessage = messages.nth(count - 1);
    await lastMessage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // ۱. کلیک راست روی پیام
    console.log('🖱 کلیک راست روی آخرین پیام...');
    await lastMessage.click({ button: 'right', position: { x: 50, y: 50 } });
    await page.waitForTimeout(1500); // صبر برای باز شدن منو

    // ۲. پیدا کردن دکمه "هدایت" با استفاده از حلقه هوشمند
    console.log('➡️ جستجو برای پیدا کردن دکمه هدایت...');
    const menuItems = page.locator('.btn-menu-item');
    const menuCount = await menuItems.count();
    let isForwardClicked = false;

    for (let i = 0; i < menuCount; i++) {
        const item = menuItems.nth(i);
        
        // چک می‌کنیم که دکمه مخفی نباشد (کلاس hide نداشته باشد)
        const isHidden = await item.evaluate(el => el.classList.contains('hide'));
        if (isHidden) continue;

        // استخراج متن دکمه
        const text = await item.innerText();
        
        // اگر متن دکمه شامل "هدایت" بود (بدون حساسیت به فاصله‌های اضافه)
        if (text && text.trim() === 'هدایت') {
            await item.click();
            isForwardClicked = true;
            console.log('✅ روی دکمه هدایت با موفقیت کلیک شد!');
            break; // خروج از حلقه
        }
    }

    if (!isForwardClicked) {
        console.log('❌ دکمه هدایت در منو پیدا نشد! عملیات متوقف شد.');
        return;
    }

    await page.waitForTimeout(2000); // صبر برای باز شدن پنجره مخاطبین

    // ۳. جستجوی "ذخیره"
    console.log('🗂 جستجوی چت "پیام‌های ذخیره شده"...');
    await page.keyboard.type('ذخیره', { delay: 200 }); 
    await page.waitForTimeout(2500); // صبر تا ایتا نتایج را پیدا کند

    // ۴. انتخاب چت پیدا شده
    console.log('🎯 انتخاب مقصد...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter'); 
    await page.waitForTimeout(1500); // صبر برای آماده شدن دکمه ارسال نهایی

    // ۵. ارسال نهایی
    console.log('🚀 در حال ارسال پیام به مقصد...');
    await page.keyboard.press('Enter'); 
    
    console.log('\n🎉 جادوی اتوماسیون با موفقیت انجام شد!');
    console.log('✅ به ایتا سر بزنید، باید پیام در "پیام‌های ذخیره شده" شما فوروارد شده باشد.');
    
    // ربات مرورگر را نمی‌بندد تا شما نتیجه را با چشم خودتان ببینید!
    console.log('❌ مرورگر تا ۱۵ ثانیه دیگر باز می‌ماند...');
    await page.waitForTimeout(15000);
    await context.close();
})();