import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";

type DriveApiError = {
  response?: {
    status?: number;
    statusText?: string;
    data?: unknown;
  };
  message?: string;
  code?: string;
  errors?: Array<{ message?: string; domain?: string; reason?: string }>;
};

const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "EPIPE"]);
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 2_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFolderId(raw?: string | null): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  // Поддерживаем сценарий, когда пользователь вставил полный URL папки.
  if (trimmed.startsWith("http")) {
    const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch?.[1]) {
      return folderMatch[1];
    }

    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch?.[1]) {
      return idParamMatch[1];
    }
  }

  return trimmed;
}

function isRetryableDriveError(err: DriveApiError): boolean {
  if (err.response?.status && RETRYABLE_STATUS_CODES.has(err.response.status)) {
    return true;
  }

  if (err.code && RETRYABLE_ERROR_CODES.has(err.code)) {
    return true;
  }

  // Ошибки 429 (rate limit) тоже стоит ретраить
  if (err.response?.status === 429) {
    return true;
  }

  return false;
}

function enrichDriveError(
  rawError: unknown,
  targetFolderId: string,
  localPath: string
): Error {
  const err = rawError as DriveApiError;

  console.error("[Drive] ========== UPLOAD ERROR ==========");
  console.error("[Drive] Error status:", err.response?.status);
  console.error("[Drive] Error statusText:", err.response?.statusText);
  console.error("[Drive] Error code:", err.code);
  console.error("[Drive] Error message:", err.message || String(rawError));
  console.error("[Drive] Error data:", JSON.stringify(err.response?.data, null, 2));
  console.error("[Drive] Error errors array:", JSON.stringify(err.errors, null, 2));
  console.error("[Drive] Used folderId:", targetFolderId);
  console.error("[Drive] File path:", localPath);
  console.error("[Drive] File exists:", fs.existsSync(localPath));
  if (fs.existsSync(localPath)) {
    const stats = fs.statSync(localPath);
    console.error("[Drive] File size:", stats.size, "bytes");
  }
  console.error("[Drive] ==================================");

  let errorMessage = err.message || "Неизвестная ошибка при загрузке в Google Drive";

  if (err.response?.status === 401) {
    errorMessage = "Ошибка авторизации Google Drive. Проверьте GDRIVE_REFRESH_TOKEN";
  } else if (err.response?.status === 403) {
    errorMessage = "Нет доступа к папке Google Drive. Проверьте права доступа и GDRIVE_FOLDER_ID";
  } else if (err.response?.status === 404) {
    errorMessage = "Папка Google Drive не найдена. Проверьте GDRIVE_FOLDER_ID";
  } else if (err.errors && err.errors.length > 0) {
    errorMessage = err.errors.map((e) => e.message || e.reason || "Ошибка").join("; ");
  }

  const enhancedError = new Error(errorMessage);
  (enhancedError as any).originalError = rawError;
  (enhancedError as any).status = err.response?.status;
  (enhancedError as any).code = err.code;

  return enhancedError;
}

function resolveRetryConfig() {
  // TODO: move Drive retry config to a shared config helper once it exists.
  const maxRetries = Number(process.env.GDRIVE_UPLOAD_MAX_RETRIES ?? DEFAULT_MAX_RETRIES);
  const retryDelay =
    Number(process.env.GDRIVE_UPLOAD_RETRY_DELAY_MS ?? DEFAULT_RETRY_DELAY_MS);

  return {
    maxRetries: Number.isFinite(maxRetries) && maxRetries > 0 ? maxRetries : DEFAULT_MAX_RETRIES,
    retryDelay: Number.isFinite(retryDelay) && retryDelay >= 0 ? retryDelay : DEFAULT_RETRY_DELAY_MS,
  };
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Инициализирует OAuth2 клиент для Google Drive
 */
function getDriveAuth(): OAuth2Client {
  const clientId = process.env.GDRIVE_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;

  console.log("[Drive] Initializing OAuth2 client...");
  console.log("[Drive] Env GDRIVE_CLIENT_ID =", clientId ? "SET" : "NOT SET");
  console.log("[Drive] Env GDRIVE_CLIENT_SECRET =", clientSecret ? "SET" : "NOT SET");
  console.log("[Drive] Env GDRIVE_REFRESH_TOKEN =", refreshToken ? "SET" : "NOT SET");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET и GDRIVE_REFRESH_TOKEN должны быть заданы в .env"
    );
  }

  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: "http://localhost:3000/oauth2callback",
  });

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

export async function uploadFileToDrive(
  localPath: string,
  fileName?: string,
  folderId?: string | null // Если передан, используется этот folderId, иначе GDRIVE_FOLDER_ID из .env
): Promise<DriveUploadResult> {
  // Определяем папку: сначала используем переданный folderId, затем из .env
  const preferredFolder = normalizeFolderId(folderId);
  const fallbackFolder = normalizeFolderId(process.env.GDRIVE_FOLDER_ID || null);
  const targetFolderId = preferredFolder || fallbackFolder;

  console.log("[Drive] Target folder ID =", targetFolderId);
  console.log("[Drive] Source:", folderId ? "channel.gdriveFolderId" : "GDRIVE_FOLDER_ID from .env");

  if (!targetFolderId) {
    throw new Error("GDRIVE_FOLDER_ID должен быть задан в .env или в настройках канала");
  }

  // Авторизация через OAuth2
  const auth = getDriveAuth();
  const drive = google.drive({ version: "v3", auth });

  // Определяем имя файла
  const finalFileName = fileName || path.basename(localPath);

  console.log("[Drive] Uploading to folder:", targetFolderId, "file:", finalFileName);
  console.log("[Drive] Local file path:", localPath);

  // Проверяем, что файл существует
  if (!fs.existsSync(localPath)) {
    throw new Error(`Файл не найден: ${localPath}`);
  }

  const fileStats = fs.statSync(localPath);
  console.log("[Drive] File size:", fileStats.size, "bytes");

  const { maxRetries, retryDelay } = resolveRetryConfig();
  const mimeType = "video/mp4";

  const createStream = () => {
    const stream = fs.createReadStream(localPath);
    stream.on("error", (streamError) => {
      console.error("[Drive] Read stream error:", streamError);
    });
    return stream;
  };

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const attemptLabel = `[Drive] Attempt ${attempt}/${maxRetries}`;
    console.log(`${attemptLabel} Creating file with parents:`, [targetFolderId]);

    const stream = createStream();
    try {
      const res = await drive.files.create(
        {
          requestBody: {
            name: finalFileName,
            parents: [targetFolderId],
          },
          media: {
            mimeType,
            body: stream,
          },
          fields: "id, name, parents, webViewLink, webContentLink",
          supportsAllDrives: true, // Для поддержки Shared Drives
          uploadType: "resumable",
        },
        {
          // TODO: surface progress to monitoring / telemetry once metrics service is ready.
        }
      );

      console.log("[Drive] Uploaded file info:", {
        id: res.data.id,
        name: res.data.name,
        parents: res.data.parents,
        webViewLink: res.data.webViewLink,
      });

      if (!res.data.id) {
        throw new Error("Не удалось загрузить файл в Google Drive");
      }

      console.log("[Drive] UPLOAD SUCCESS", { fileId: res.data.id });

      return {
        fileId: res.data.id,
        webViewLink: res.data.webViewLink || undefined,
        webContentLink: res.data.webContentLink || undefined,
      };
    } catch (error: unknown) {
      stream.destroy();

      const driveError = error as DriveApiError;
      const shouldRetry = attempt < maxRetries && isRetryableDriveError(driveError);

      if (shouldRetry) {
        const waitTime = retryDelay * attempt;
        console.warn(
          `[Drive] Upload attempt ${attempt} failed (${driveError.response?.status || driveError.code || driveError.message}). Retrying in ${waitTime}ms...`
        );
        await delay(waitTime);
        continue;
      }

      throw enrichDriveError(error, targetFolderId, localPath);
    }
  }

  throw new Error("Не удалось загрузить файл в Google Drive после повторных попыток");
}

