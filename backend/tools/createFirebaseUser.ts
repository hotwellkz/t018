/**
 * Скрипт для создания пользователя в Firebase Authentication
 * Запуск: npx ts-node tools/createFirebaseUser.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as admin from "firebase-admin";

// Загружаем переменные окружения
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });
dotenv.config();

const USER_EMAIL = "hotwell.kz@gmail.com";
const USER_PASSWORD = "fghRTht3@";

async function createFirebaseUser() {
  console.log("=== Создание пользователя в Firebase Authentication ===\n");

  try {
    // Инициализируем Firebase
    const { initializeFirebase } = await import("../src/firebase/admin");
    initializeFirebase();

    // Проверяем, существует ли пользователь
    let userRecord: admin.auth.UserRecord;
    try {
      const user = await admin.auth().getUserByEmail(USER_EMAIL);
      userRecord = user;
      console.log(`✅ Пользователь ${USER_EMAIL} уже существует (UID: ${userRecord.uid})`);
      
      // Обновляем пароль, если нужно
      console.log("\nОбновляем пароль...");
      await admin.auth().updateUser(userRecord.uid, {
        password: USER_PASSWORD,
      });
      console.log("✅ Пароль обновлён");
      
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        console.log(`Создаём пользователя ${USER_EMAIL}...`);
        userRecord = await admin.auth().createUser({
          email: USER_EMAIL,
          password: USER_PASSWORD,
          emailVerified: false,
        });
        console.log(`✅ Пользователь создан (UID: ${userRecord.uid})`);
      } else {
        throw error;
      }
    }

    console.log("\n✅✅✅ Готово!");
    console.log(`\nДанные для входа:`);
    console.log(`  Email: ${USER_EMAIL}`);
    console.log(`  Пароль: ${USER_PASSWORD}`);
    console.log(`  UID: ${userRecord.uid}`);

    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Ошибка:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

createFirebaseUser();



