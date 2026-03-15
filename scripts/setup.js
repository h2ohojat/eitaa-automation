import { execSync } from "child_process";
import fs from "fs";

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

// Create folders
["logs", "eitaa-session"].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created ${dir}`);
  }
});

// Copy config
if (!fs.existsSync("config.json")) {
  fs.copyFileSync("config.example.json", "config.json");
  console.log("✅ config.json created");
}

if (!fs.existsSync("admins.txt")) {
  fs.copyFileSync("admins.example.txt", "admins.txt");
  console.log("✅ admins.txt created");
}

console.log("\n✅ Setup completed successfully!");
