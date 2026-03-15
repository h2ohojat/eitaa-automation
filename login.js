const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log("🔄 در حال آماده‌سازی ماژول لاگین...");

    // مسیر ذخیره‌سازی نشست (Session) در پوشه جاری
    const userDataDir = path.join(__dirname, 'eitaa-session');

    try {
        console.log("🌐 در حال باز کردن مرورگر کروم سیستم شما (برای جلوگیری از خطای دانلود Playwright)...");
        
        // اجرای مرورگر با استفاده از کروم نصب شده روی ویندوز
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: false,       // باید فالس باشد تا صفحه را ببینید
            channel: 'chrome',     // استفاده از گوگل کروم ویندوز برای دور زدن تحریم
            viewport: null,        // اجازه می‌دهد مرورگر با سایز طبیعی باز شود
            args: ['--start-maximized'] // تلاش برای باز شدن در حالت بزرگ
        });

        // مدیریت تب‌ها (اگر تبی باز بود همان را می‌گیرد، وگرنه تب جدید می‌سازد)
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

        console.log("🔗 در حال ورود به نسخه وب ایتا...");
        // زمان انتظار (Timeout) را بالا بردیم تا در صورت کندی اینترنت ارور ندهد
        await page.goto('https://web.eitaa.com/', { timeout: 60000 }); 

        console.log("\n==================================================================");
        console.log("⏳ منتظر اقدام شما هستیم...");
        console.log("۱. لطفاً شماره موبایل خود را وارد کرده و کد پیامکی را بزنید.");
        console.log("۲. اجازه دهید لیست چت‌ها (از جمله کانال pyamooz) کاملاً لود شود.");
        console.log("۳. پس از اتمام کار، فقط کافیست پنجره مرورگر را از ضربدر بالا ببندید.");
        console.log("==================================================================\n");

        // توقف برنامه تا زمانی که شما مرورگر را به صورت دستی ببندید
        await context.waitForEvent('close');

        // بررسی اینکه آیا پوشه نشست واقعاً ساخته شده است یا خیر
        if (fs.existsSync(userDataDir)) {
            console.log("✅ عالی! مرورگر بسته شد و اطلاعات نشست (Session) با موفقیت ذخیره شد.");
            console.log("📂 پوشه eitaa-session در مسیر پروژه شما ایجاد شد.");
            console.log("🚀 حالا آماده رفتن به مرحله بعد (کد خواندن پیام ۱۱۷) هستیم!");
        } else {
            console.log("⚠️ مرورگر بسته شد اما پوشه نشست پیدا نشد. ممکن است مشکلی رخ داده باشد.");
        }

    } catch (error) {
        console.error("\n❌ خطایی رخ داده است:");
        // مدیریت خطای پیدا نشدن کروم
        if (error.message.includes('executablePath')) {
            console.error("به نظر می‌رسد مرورگر Google Chrome در مسیر پیش‌فرض سیستم شما نصب نیست!");
            console.error("💡 راه حل: در کد بالا، خط channel: 'chrome' را به channel: 'msedge' تغییر دهید تا از مرورگر اِج (Edge) استفاده شود.");
        } else {
            console.error(error.message);
        }
    }
})();