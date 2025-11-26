import { Router, Request, Response } from "express";
import { getAllChannels } from "../models/channel";
import { getAllJobs } from "../models/videoJob";

const router = Router();

/**
 * MCP Server-Sent Events endpoint
 * GET /sse
 * Поддерживает Model Context Protocol через SSE
 */
router.get("/sse", (req: Request, res: Response) => {
  console.log("[MCP] SSE connection requested");
  
  // Устанавливаем заголовки для SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

  // Отправляем начальное сообщение
  const sendSSE = (data: any) => {
    const jsonData = JSON.stringify(data);
    res.write(`data: ${jsonData}\n\n`);
  };

  // Отправляем приветственное сообщение
  sendSSE({
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: "whitecoding-backend",
        version: "1.0.0",
      },
    },
  });

  // Обработка закрытия соединения
  req.on("close", () => {
    console.log("[MCP] SSE connection closed");
    res.end();
  });

  // Периодически отправляем heartbeat для поддержания соединения
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": heartbeat\n\n");
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // каждые 30 секунд

  // Очистка при закрытии
  req.on("close", () => {
    clearInterval(heartbeatInterval);
  });
});

/**
 * MCP Tools endpoint
 * POST /mcp/tools
 * Возвращает список доступных инструментов
 */
router.get("/tools", async (req: Request, res: Response) => {
  try {
    const tools = [
      {
        name: "get_channels",
        description: "Получить список всех каналов",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_video_jobs",
        description: "Получить список задач генерации видео",
        inputSchema: {
          type: "object",
          properties: {
            channelId: {
              type: "string",
              description: "ID канала (опционально)",
            },
            status: {
              type: "string",
              description: "Статус задачи (опционально)",
              enum: ["pending", "processing", "ready", "uploaded", "failed"],
            },
          },
        },
      },
      {
        name: "get_automation_status",
        description: "Получить статус автоматизации",
        inputSchema: {
          type: "object",
          properties: {
            channelId: {
              type: "string",
              description: "ID канала (опционально)",
            },
          },
        },
      },
    ];

    res.json({
      jsonrpc: "2.0",
      result: {
        tools,
      },
    });
  } catch (error: any) {
    console.error("[MCP] Error getting tools:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message,
      },
    });
  }
});

/**
 * MCP Tool execution endpoint
 * POST /mcp/tools/call
 * Выполняет инструмент
 */
router.post("/tools/call", async (req: Request, res: Response) => {
  try {
    const { name, arguments: args } = req.body;

    console.log(`[MCP] Tool call: ${name}`, args);

    let result: any;

    switch (name) {
      case "get_channels": {
        const channels = await getAllChannels();
        result = {
          channels: channels.map((ch) => ({
            id: ch.id,
            name: ch.name,
            description: ch.description,
            automation: ch.automation
              ? {
                  enabled: ch.automation.enabled,
                  status: ch.automation.status,
                  isRunning: ch.automation.isRunning,
                }
              : null,
          })),
        };
        break;
      }

      case "get_video_jobs": {
        const channelId = args?.channelId;
        const status = args?.status;
        const jobs = await getAllJobs(channelId);
        const filteredJobs = status
          ? jobs.filter((job) => job.status === status)
          : jobs;
        result = {
          jobs: filteredJobs.map((job) => ({
            id: job.id,
            channelId: job.channelId,
            channelName: job.channelName,
            status: job.status,
            videoTitle: job.videoTitle,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
          })),
          total: filteredJobs.length,
        };
        break;
      }

      case "get_automation_status": {
        const channelId = args?.channelId;
        const channels = await getAllChannels();
        const relevantChannels = channelId
          ? channels.filter((ch) => ch.id === channelId)
          : channels;

        result = {
          channels: relevantChannels
            .filter((ch) => ch.automation)
            .map((ch) => ({
              id: ch.id,
              name: ch.name,
              automation: {
                enabled: ch.automation?.enabled,
                status: ch.automation?.status,
                isRunning: ch.automation?.isRunning,
                lastRunAt: ch.automation?.lastRunAt,
                nextRunAt: ch.automation?.nextRunAt,
                statusMessage: ch.automation?.statusMessage,
              },
            })),
        };
        break;
      }

      default:
        return res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Method not found",
            data: `Unknown tool: ${name}`,
          },
        });
    }

    res.json({
      jsonrpc: "2.0",
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      },
    });
  } catch (error: any) {
    console.error("[MCP] Error executing tool:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message,
      },
    });
  }
});

/**
 * MCP Resources endpoint
 * GET /mcp/resources
 * Возвращает список доступных ресурсов
 */
router.get("/resources", async (req: Request, res: Response) => {
  try {
    const resources = [
      {
        uri: "whitecoding://channels",
        name: "Channels",
        description: "Список всех каналов",
        mimeType: "application/json",
      },
      {
        uri: "whitecoding://video-jobs",
        name: "Video Jobs",
        description: "Список задач генерации видео",
        mimeType: "application/json",
      },
    ];

    res.json({
      jsonrpc: "2.0",
      result: {
        resources,
      },
    });
  } catch (error: any) {
    console.error("[MCP] Error getting resources:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message,
      },
    });
  }
});

/**
 * MCP Resource read endpoint
 * GET /mcp/resources/read
 * Читает ресурс
 */
router.get("/resources/read", async (req: Request, res: Response) => {
  try {
    const { uri } = req.query;

    if (!uri || typeof uri !== "string") {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32602,
          message: "Invalid params",
          data: "uri parameter is required",
        },
      });
    }

    let content: string;

    switch (uri) {
      case "whitecoding://channels": {
        const channels = await getAllChannels();
        content = JSON.stringify(channels, null, 2);
        break;
      }

      case "whitecoding://video-jobs": {
        const jobs = await getAllJobs();
        content = JSON.stringify(jobs, null, 2);
        break;
      }

      default:
        return res.status(404).json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Resource not found",
            data: `Unknown resource: ${uri}`,
          },
        });
    }

    res.json({
      jsonrpc: "2.0",
      result: {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: content,
          },
        ],
      },
    });
  } catch (error: any) {
    console.error("[MCP] Error reading resource:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: error.message,
      },
    });
  }
});

export default router;







