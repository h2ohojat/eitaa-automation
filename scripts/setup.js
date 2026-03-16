const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const {
  PROJECT_ROOT,
  ADMINS_FILE,
  CONFIG_FILE,
  LOGS_DIR,
  SESSION_DIR
} = require("../core/paths");

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

console.log("🔧 Eitaa Automation Setup Started...");

// Check Node.js version
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (Number.isNaN(nodeMajor) || nodeMajor < 20) {
  console.error("❌ Node.js v20+ is required");
  process.exit(1);
}

// Install dependencies
run("npm install");
// Install Playwright browser (chromium)
try {
  run("npx playwright install chromium");
} catch (error) {
  console.warn("⚠️ Playwright browser install failed, please install manually or run with internet access.");
  console.warn("   You can still run the bot if a system Chromium is available or use playwright install later.");
  console.warn(`   Error: ${error.message}`);
}

const CONFIG_EXAMPLE = path.join(PROJECT_ROOT, "config.example.json");
const ADMINS_EXAMPLE = path.join(PROJECT_ROOT, "admins.example.txt");

// Create folders
[LOGS_DIR, SESSION_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created ${path.basename(dir)}`);
  }
});

// Copy config
if (!fs.existsSync(CONFIG_FILE)) {
  fs.copyFileSync(CONFIG_EXAMPLE, CONFIG_FILE);
  console.log("✅ config.json created");
}

if (!fs.existsSync(ADMINS_FILE)) {
  fs.copyFileSync(ADMINS_EXAMPLE, ADMINS_FILE);
  console.log("✅ admins.txt created");
}

console.log("\n✅ Setup completed successfully!");
