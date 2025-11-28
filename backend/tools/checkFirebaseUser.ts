/**
 * Скрипт для проверки пользователя в Firebase Authentication
 * Запуск: npx ts-node tools/checkFirebaseUser.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as admin from "firebase-admin";

// Загружаем переменные окружения
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });
dotenv.config();

const USER_EMAIL = "hotwell.kz@gmail.com";

async function checkFirebaseUser() {
  console.log("=== Проверка пользователя в Firebase Authentication ===\n");

  try {
    // Инициализируем Firebase
    const { initializeFirebase } = await import("../src/firebase/admin");
    initializeFirebase();

    try {
      const user = await admin.auth().getUserByEmail(USER_EMAIL);
      
      console.log("✅ Пользователь найден:");
      console.log(`  UID: ${user.uid}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Email Verified: ${user.emailVerified}`);
      console.log(`  Disabled: ${user.disabled}`);
      console.log(`  Created: ${user.metadata.creationTime}`);
      console.log(`  Last Sign In: ${user.metadata.lastSignInTime || "Никогда"}`);
      
      // Проверяем провайдеры
      console.log("\nПровайдеры авторизации:");
      if (user.providerData && user.providerData.length > 0) {
        user.providerData.forEach((provider, index) => {
          console.log(`  ${index + 1}. ${provider.providerId} (${provider.uid})`);
        });
      } else {
        console.log("  ⚠️  Провайдеры не найдены");
      }

      // Проверяем, есть ли пароль
      const hasPassword = user.providerData.some(p => p.providerId === "password");
      if (!hasPassword) {
        console.log("\n⚠️  ВНИМАНИЕ: У пользователя нет провайдера password!");
        console.log("   Это означает, что вход по email/паролю может не работать.");
        console.log("   Нужно создать пользователя заново или установить пароль.");
      } else {
        console.log("\n✅ Провайдер password найден - вход по email/паролю должен работать");
      }

    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        console.error(`❌ Пользователь ${USER_EMAIL} не найден`);
        console.log("\nСоздайте пользователя командой:");
        console.log("  npm run create-firebase-user");
      } else {
        throw error;
      }
    }

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

checkFirebaseUser();



