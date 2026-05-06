import WebSocket from "ws";
import { store } from "./store";
import { BrowserWindow } from "electron";
import { runJob, type JobPayload } from "./job-runner";

let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let mainWin: BrowserWindow | null = null;

export function connectWebSocket(win: BrowserWindow | null) {
  mainWin = win;
  const providerId = store.get("providerId");
  if (!providerId) return;

  const baseUrl = store.get("apiUrl").replace(/\/api$/, "");
  const wsUrl = baseUrl
    .replace("http://", "ws://")
    .replace("https://", "wss://");

  ws = new WebSocket(`${wsUrl}/ws?providerId=${providerId}`);

  ws.on("open", () => {
    console.log("[WS] Connected");
    mainWin?.webContents.send("ws-status", "connected");
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case "JOB_ASSIGNED": {
          const jobPayload = msg.payload as JobPayload;
          store.set("currentJobId", jobPayload.jobId);
          mainWin?.webContents.send("job-assigned", jobPayload);

          // Run job in background — never blocks the WebSocket
          runJob(jobPayload, (progress) => {
            mainWin?.webContents.send("job-progress", {
              jobId: jobPayload.jobId,
              message: progress,
            });
          }).catch((err) => {
            console.error("[WS] Job runner crashed:", err.message);
            store.set("currentJobId", null);
            mainWin?.webContents.send("job-error", {
              jobId: jobPayload.jobId,
              error: err.message,
            });
          });
          break;
        }

        case "JOB_CANCELLED":
          store.set("currentJobId", null);
          mainWin?.webContents.send("job-cancelled", msg.payload);
          break;

        case "PING":
          ws?.send(JSON.stringify({ type: "PONG" }));
          break;

        default:
          console.warn("[WS] Unknown message type:", msg.type);
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on("close", () => {
    console.log("[WS] Disconnected — reconnecting in 5s");
    mainWin?.webContents.send("ws-status", "disconnected");
    reconnectTimer = setTimeout(() => connectWebSocket(mainWin), 5000);
  });

  ws.on("error", (err) => {
    console.error("[WS] Error:", err.message);
    ws?.terminate();
  });
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ws?.close();
  ws = null;
  mainWin?.webContents.send("ws-status", "disconnected");
}
