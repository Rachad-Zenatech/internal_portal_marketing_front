import { execSync } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

function getAdbPath() {
  const isWindows = process.platform === "win32";

  // Check ANDROID_HOME or ANDROID_SDK_ROOT first
  const envSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (envSdk && fs.existsSync(envSdk)) {
    const ext = isWindows ? ".exe" : "";
    const adbPath = path.join(envSdk, "platform-tools", `adb${ext}`);
    if (fs.existsSync(adbPath)) return adbPath;
  }

  // Windows
  if (isWindows) {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(
      localAppData,
      "Android",
      "Sdk",
      "platform-tools",
      "adb.exe"
    );
  }

  // macOS
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Android", "sdk", "platform-tools", "adb");
  }

  // WSL or Linux environment
  let sdkBase = "";
  if (fs.existsSync("/mnt/c/Users")) {
    try {
      const users = fs.readdirSync("/mnt/c/Users");
      const foundUser = users.find(
        (u) =>
          u !== "Public" &&
          u !== "Default" &&
          u !== "All Users" &&
          fs.existsSync(`/mnt/c/Users/${u}/AppData/Local/Android/Sdk`)
      );
      if (foundUser) {
        sdkBase = `/mnt/c/Users/${foundUser}/AppData/Local/Android/Sdk`;
      }
    } catch {}
  }

  if (!sdkBase) {
    sdkBase = path.join(os.homedir(), "Android", "Sdk");
  }

  const ext = sdkBase.startsWith("/mnt/c") ? ".exe" : "";
  return path.join(sdkBase, "platform-tools", `adb${ext}`);
}

// Backend port the app calls, taken from EXPO_PUBLIC_API_BASE_URL in .env (default 8010).
function getBackendPort() {
  try {
    const envFile = fs.readFileSync(path.resolve(".env"), "utf-8");
    const match = envFile.match(/^EXPO_PUBLIC_API_BASE_URL=.*:(\d+)\/?\s*$/m);
    if (match) return match[1];
  } catch {}
  return "8010";
}

async function main() {
  const adbPath = getAdbPath();
  const apiPort = getBackendPort();
  console.log("🔄 Re-syncing ADB reverse ports & reloading Android app...");

  try {
    execSync(`"${adbPath}" reverse tcp:8091 tcp:8091`, { stdio: "ignore" });
    execSync(`"${adbPath}" reverse tcp:${apiPort} tcp:${apiPort}`, { stdio: "ignore" });
    execSync(`"${adbPath}" reverse tcp:5180 tcp:5180`, { stdio: "ignore" });
    console.log(`🔗 Reverse ports configured (8091, ${apiPort}, 5180).`);
  } catch (err) {
    console.log("⚠️ Could not reverse ports:", err.message);
  }

  try {
    execSync(
      `"${adbPath}" shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8091" host.exp.exponent`,
      { stdio: "inherit" }
    );
    console.log("✅ Android emulator reloaded successfully with latest bundle!");
  } catch (err) {
    console.log("❌ Failed to trigger reload on emulator:", err.message);
  }
}

main();
