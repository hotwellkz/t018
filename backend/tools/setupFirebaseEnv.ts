/**
 * Скрипт для настройки Firebase переменных окружения из JSON ключа сервисного аккаунта
 * Использование: npx ts-node tools/setupFirebaseEnv.ts path/to/service-account-key.json
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

const JSON_KEY_PATH = process.argv[2];
const ENV_FILE_PATH = path.join(__dirname, "..", ".env");

if (!JSON_KEY_PATH) {
  console.error("❌ Ошибка: укажите путь к JSON файлу сервисного аккаунта");
  console.log("\nИспользование:");
  console.log("  npx ts-node tools/setupFirebaseEnv.ts path/to/service-account-key.json");
  console.log("\nКак получить JSON ключ:");
  console.log("  1. Откройте Firebase Console: https://console.firebase.google.com/");
  console.log("  2. Выберите проект bibi-b7ce9");
  console.log("  3. Перейдите в Project Settings > Service Accounts");
  console.log("  4. Нажмите 'Generate New Private Key'");
  console.log("  5. Сохраните JSON файл");
  console.log("  6. Запустите этот скрипт с путем к файлу");
  process.exit(1);
}

if (!fs.existsSync(JSON_KEY_PATH)) {
  console.error(`❌ Файл не найден: ${JSON_KEY_PATH}`);
  process.exit(1);
}

try {
  console.log("📖 Читаю JSON ключ сервисного аккаунта...");
  const jsonContent = fs.readFileSync(JSON_KEY_PATH, "utf-8");
  const serviceAccount = JSON.parse(jsonContent);

  console.log("✅ JSON ключ успешно прочитан");
  console.log(`   Project ID: ${serviceAccount.project_id}`);
  console.log(`   Client Email: ${serviceAccount.client_email}`);

  // Загружаем существующий .env
  let envContent = "";
  if (fs.existsSync(ENV_FILE_PATH)) {
    envContent = fs.readFileSync(ENV_FILE_PATH, "utf-8");
  }

  // Удаляем старые Firebase переменные
  const lines = envContent.split("\n");
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      !trimmed.startsWith("FIREBASE_") ||
      trimmed.startsWith("#") ||
      trimmed === ""
    );
  });

  // Добавляем новые Firebase переменные
  const firebaseVars = [
    "",
    "# Firebase Configuration",
    `FIREBASE_PROJECT_ID=${serviceAccount.project_id}`,
    `FIREBASE_PRIVATE_KEY_ID=${serviceAccount.private_key_id}`,
    `FIREBASE_PRIVATE_KEY="${serviceAccount.private_key.replace(/\n/g, "\\n")}"`,
    `FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`,
    `FIREBASE_CLIENT_ID=${serviceAccount.client_id}`,
    `FIREBASE_AUTH_URI=${serviceAccount.auth_uri || "https://accounts.google.com/o/oauth2/auth"}`,
    `FIREBASE_TOKEN_URI=${serviceAccount.token_uri || "https://oauth2.googleapis.com/token"}`,
    `FIREBASE_AUTH_PROVIDER_X509_CERT_URL=${serviceAccount.auth_provider_x509_cert_url || "https://www.googleapis.com/oauth2/v1/certs"}`,
    `FIREBASE_CLIENT_X509_CERT_URL=${serviceAccount.client_x509_cert_url}`,
    `FIREBASE_UNIVERSE_DOMAIN=${serviceAccount.universe_domain || "googleapis.com"}`,
  ];

  const newEnvContent = [...filteredLines, ...firebaseVars].join("\n");

  // Сохраняем обновленный .env
  fs.writeFileSync(ENV_FILE_PATH, newEnvContent, "utf-8");

  console.log("\n✅✅✅ Firebase переменные успешно добавлены в .env!");
  console.log(`\nФайл обновлен: ${ENV_FILE_PATH}`);
  console.log("\nТеперь можно запустить миграцию:");
  console.log("  npm run migrate-user-data");
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("\n❌ Ошибка:", errorMessage);
  if (error instanceof Error && error.stack) {
    console.error("Stack:", error.stack);
  }
  process.exit(1);
}



