/**
 * Простой тест загрузки файла в Google Drive
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { uploadFileToDrive } from "./googleDrive/driveService";

// Загружаем переменные окружения
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });
dotenv.config();

async function testUpload() {
  console.log("=== Тест загрузки файла в Google Drive ===\n");

  const folderId = process.env.GDRIVE_FOLDER_ID;
  if (!folderId) {
    console.error("❌ GDRIVE_FOLDER_ID не задан");
    process.exit(1);
  }

  // Создаём тестовый файл
  const testDir = path.join(__dirname, "..", "downloads");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFile = path.join(testDir, `test_${Date.now()}.txt`);
  fs.writeFileSync(testFile, "Тестовый файл для проверки загрузки в Google Drive");

  console.log(`Создан тестовый файл: ${testFile}`);
  console.log(`Папка назначения: ${folderId}\n`);

  try {
    console.log("Начинаем загрузку...\n");
    const result = await uploadFileToDrive(testFile, `test_${Date.now()}.txt`, folderId);

    console.log("\n✅✅✅ УСПЕШНО ЗАГРУЖЕНО!");
    console.log("File ID:", result.fileId);
    console.log("Web View Link:", result.webViewLink || "N/A");
    console.log("Web Content Link:", result.webContentLink || "N/A");
    console.log("\nПроверьте папку в Google Drive!");

    // Удаляем тестовый файл
    fs.unlinkSync(testFile);
  } catch (error: any) {
    console.error("\n❌ Ошибка загрузки:");
    console.error("Сообщение:", error.message);
    console.error("Статус:", error.status);
    console.error("Код:", error.code);
    
    if (error.originalError?.response?.data) {
      console.error("\nДетали ошибки:");
      console.error(JSON.stringify(error.originalError.response.data, null, 2));
    }

    if (error.status === 401) {
      console.error("\n💡 Ошибка авторизации. Проверьте refresh token.");
    } else if (error.status === 403) {
      console.error("\n💡 Нет доступа к папке. Проверьте права доступа.");
    } else if (error.status === 404) {
      console.error("\n💡 Папка не найдена. Проверьте GDRIVE_FOLDER_ID.");
    } else if (error.status === 500) {
      console.error("\n💡 Ошибка 500 от Google Drive API. Возможные причины:");
      console.error("   - Проблемы с сетью");
      console.error("   - Временные проблемы на стороне Google");
      console.error("   - Недостаточные права доступа");
    }

    // Удаляем тестовый файл даже при ошибке
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    process.exit(1);
  }
}

testUpload();

