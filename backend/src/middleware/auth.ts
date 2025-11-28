import { Request, Response, NextFunction } from "express";
import { getFirestore } from "../firebase/admin";
import * as admin from "firebase-admin";

/**
 * Расширяем Request для добавления поля user
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
      };
    }
  }
}

/**
 * Middleware для проверки Firebase ID Token
 * Ожидает токен в заголовке Authorization: Bearer <token>
 */
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Токен авторизации не предоставлен" });
      return;
    }

    const token = authHeader.split("Bearer ")[1];

    if (!token) {
      res.status(401).json({ error: "Токен авторизации не предоставлен" });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
      next();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[Auth] Ошибка верификации токена:", errorMessage);
      res.status(401).json({ error: "Недействительный токен авторизации" });
      return;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Auth] Ошибка в middleware авторизации:", errorMessage);
    res.status(500).json({ error: "Ошибка проверки авторизации" });
    return;
  }
}

/**
 * Опциональная проверка токена - не блокирует запрос, но добавляет user если токен валиден
 */
export async function optionalVerifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.split("Bearer ")[1];

    if (!token) {
      next();
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch (error) {
      // Игнорируем ошибки при опциональной проверке
      console.log("[Auth] Опциональная проверка токена не прошла, продолжаем без авторизации");
    }

    next();
  } catch (error) {
    // Игнорируем ошибки при опциональной проверке
    next();
  }
}



