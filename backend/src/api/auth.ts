import { Router, Request, Response } from "express";
import { verifyToken } from "../middleware/auth";
import * as admin from "firebase-admin";

const router = Router();

/**
 * POST /api/auth/register
 * Создание нового пользователя (только для админов или для первого пользователя)
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны" });
    }

    // Проверяем, есть ли уже пользователи
    const listUsers = await admin.auth().listUsers();
    const userExists = listUsers.users.find((u) => u.email === email);

    if (userExists) {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }

    // Создаём пользователя
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
    });

    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      message: "Пользователь успешно создан",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Auth] Ошибка регистрации:", errorMessage);
    res.status(500).json({ error: "Ошибка при создании пользователя", details: errorMessage });
  }
});

/**
 * GET /api/auth/me
 * Получить информацию о текущем пользователе
 */
router.get("/me", verifyToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    const userRecord = await admin.auth().getUser(req.user.uid);

    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Auth] Ошибка получения информации о пользователе:", errorMessage);
    res.status(500).json({ error: "Ошибка при получении информации о пользователе" });
  }
});

export default router;

