/**
 * Миграция: присвоение существующих данных пользователю
 * Запуск: npx ts-node tools/migrateUserData.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { getFirestore } from "../src/firebase/admin";
import * as admin from "firebase-admin";

// Загружаем переменные окружения
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });
dotenv.config();

const USER_EMAIL = "hotwell.kz@gmail.com";
const USER_PASSWORD = "fghRTht3@";

async function migrateUserData() {
  console.log("=== Миграция данных пользователя ===\n");

  try {
    // Инициализируем Firebase
    const { initializeFirebase } = await import("../src/firebase/admin");
    initializeFirebase();

    // Проверяем или создаём пользователя
    let userRecord: admin.auth.UserRecord;
    try {
      const user = await admin.auth().getUserByEmail(USER_EMAIL);
      userRecord = user;
      console.log(`✅ Пользователь ${USER_EMAIL} уже существует (UID: ${userRecord.uid})`);
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

    const userId = userRecord.uid;
    console.log(`\nИспользуем UID: ${userId}\n`);

    const db = getFirestore();

    // Миграция каналов
    console.log("Миграция каналов...");
    const channelsSnapshot = await db.collection("channels").get();
    let channelsUpdated = 0;
    let channelsSkipped = 0;

    for (const doc of channelsSnapshot.docs) {
      const data = doc.data();
      if (!data.userId || data.userId === "") {
        await doc.ref.update({ userId });
        channelsUpdated++;
        console.log(`  ✅ Канал "${data.name}" (${doc.id}) присвоен пользователю`);
      } else {
        channelsSkipped++;
        console.log(`  ⏭️  Канал "${data.name}" (${doc.id}) уже имеет userId: ${data.userId}`);
      }
    }

    console.log(`\nКаналы: обновлено ${channelsUpdated}, пропущено ${channelsSkipped}\n`);

    // Миграция videoJobs
    console.log("Миграция задач генерации видео...");
    const jobsSnapshot = await db.collection("videoJobs").get();
    let jobsUpdated = 0;
    let jobsSkipped = 0;

    for (const doc of jobsSnapshot.docs) {
      const data = doc.data();
      if (!data.userId || data.userId === "") {
        await doc.ref.update({ userId });
        jobsUpdated++;
        console.log(`  ✅ Задача ${doc.id} присвоена пользователю`);
      } else {
        jobsSkipped++;
        console.log(`  ⏭️  Задача ${doc.id} уже имеет userId: ${data.userId}`);
      }
    }

    console.log(`\nЗадачи: обновлено ${jobsUpdated}, пропущено ${jobsSkipped}\n`);

    console.log("✅✅✅ Миграция завершена успешно!");
    console.log(`\nВсе данные присвоены пользователю ${USER_EMAIL} (UID: ${userId})`);
    console.log(`\nДля входа используйте:`);
    console.log(`  Email: ${USER_EMAIL}`);
    console.log(`  Пароль: ${USER_PASSWORD}`);

    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Ошибка миграции:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

migrateUserData();

