#!/usr/bin/env node
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

// 1. 명령행 인자에서 URL 가져오기
let url = process.argv[2];

// 2. 명령행 인자가 없으면 자동 감지
if (!url) {
  try {
    // 환경변수에서 Metro URL 확인
    if (process.env.EXPO_METRO_URL) {
      url = process.env.EXPO_METRO_URL;
      console.log(`📱 Metro URL from env: ${url}`);
    } else {
      // 기본값: localhost:8081 (개발 환경)
      url = "exps://localhost:8081";
      console.log(`📱 Using default Metro URL: ${url}`);
    }
  } catch (e) {
    console.error("❌ Could not detect Metro URL. Usage: node scripts/generate_qr.mjs [exps://...]");
    process.exit(1);
  }
}

// 3. QR 코드 생성
try {
  const qrPath = path.join(projectRoot, "expo-qr-code.png");
  await QRCode.toFile(qrPath, url, {
    width: 512,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
  console.log(`✅ QR code saved to ${qrPath}`);
  console.log(`📲 Scan this QR code with Expo Go to run the app`);
  console.log(`🔗 URL: ${url}`);
} catch (error) {
  console.error("❌ Failed to generate QR code:", error.message);
  process.exit(1);
}
