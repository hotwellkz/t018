/**
 * Тестовый скрипт для проверки авторизации Google Drive
 * Запуск: npx ts-node src/test-drive-auth.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Загружаем переменные окружения
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });
dotenv.config();

async function testAuth() {
  console.log("=== Тест авторизации Google Drive ===\n");

  // Проверяем переменные окружения
  console.log("Проверка переменных окружения:");
  console.log("GDRIVE_FOLDER_ID:", process.env.GDRIVE_FOLDER_ID || "НЕ ЗАДАН");
  console.log("GDRIVE_CLIENT_ID:", process.env.GDRIVE_CLIENT_ID ? "ЗАДАН" : "НЕ ЗАДАН");
  console.log("GDRIVE_CLIENT_SECRET:", process.env.GDRIVE_CLIENT_SECRET ? "ЗАДАН" : "НЕ ЗАДАН");
  console.log("GDRIVE_REFRESH_TOKEN:", process.env.GDRIVE_REFRESH_TOKEN ? "ЗАДАН" : "НЕ ЗАДАН");
  console.log("");

  const clientId = process.env.GDRIVE_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;
  const folderId = process.env.GDRIVE_FOLDER_ID;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("❌ Не все переменные окружения заданы");
    process.exit(1);
  }

  if (!folderId) {
    console.error("❌ GDRIVE_FOLDER_ID не задан");
    process.exit(1);
  }

  try {
    console.log("Инициализация OAuth2 клиента...\n");
    const oauth2Client = new OAuth2Client({
      clientId,
      clientSecret,
      redirectUri: "http://localhost:3000/oauth2callback",
    });

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    console.log("Попытка получить access token...\n");
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log("✅ Access token получен успешно!");
    console.log("Token expires at:", credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : "N/A");
    console.log("");

    console.log("Проверка доступа к папке Google Drive...\n");
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    try {
      const folderResponse = await drive.files.get({
        fileId: folderId,
        fields: "id, name, mimeType",
        supportsAllDrives: true,
      });

      console.log("✅ Папка найдена:");
      console.log("  ID:", folderResponse.data.id);
      console.log("  Название:", folderResponse.data.name);
      console.log("  Тип:", folderResponse.data.mimeType);
      console.log("");

      // Проверяем права доступа
      console.log("Проверка прав доступа...\n");
      const permissionsResponse = await drive.permissions.list({
        fileId: folderId,
        fields: "permissions(id, role, type)",
        supportsAllDrives: true,
      });

      console.log("✅ Права доступа получены");
      console.log("  Количество прав:", permissionsResponse.data.permissions?.length || 0);
      console.log("");

      console.log("✅✅✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! Авторизация Google Drive работает корректно!");
      console.log("\nТеперь можно загружать видео в папку:", folderResponse.data.name);

    } catch (folderError: any) {
      console.error("❌ Ошибка при доступе к папке:");
      console.error("  Статус:", folderError.response?.status);
      console.error("  Сообщение:", folderError.message);
      if (folderError.response?.data) {
        console.error("  Детали:", JSON.stringify(folderError.response.data, null, 2));
      }

      if (folderError.response?.status === 401) {
        console.error("\n💡 Возможно, refresh token истёк или недействителен.");
        console.error("   Запустите: npm run get-drive-token");
      } else if (folderError.response?.status === 403) {
        console.error("\n💡 Нет доступа к папке. Проверьте права доступа в Google Drive.");
      } else if (folderError.response?.status === 404) {
        console.error("\n💡 Папка не найдена. Проверьте GDRIVE_FOLDER_ID.");
      }

      process.exit(1);
    }
  } catch (error: any) {
    console.error("\n❌ Ошибка авторизации:");
    console.error("  Сообщение:", error.message);
    if (error.response?.data) {
      console.error("  Детали:", JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status === 401) {
      console.error("\n💡 Возможно, refresh token истёк или недействителен.");
      console.error("   Запустите: npm run get-drive-token");
    }
    process.exit(1);
  }
}

testAuth();

