import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import axios from "axios";
import { store } from "./store";
import { detectHardware } from "./detect";
import { HeartbeatService } from "./heartbeat";
import { connectWebSocket, disconnectWebSocket } from "./ws-client";
import { setupTray } from "./tray";
import { generateAgentKeypair } from "@repo/crypto";
import { agentRequest } from "./api-client";

let isQuitting = false;
app.on("before-quit", () => {
  isQuitting = true;
});

let mainWindow: BrowserWindow | null = null;
const heartbeat = new HeartbeatService();
let trayController: { update: () => void } | null = null;

async function ensureAgentConnected(providerId: string) {
  const token = store.get("token");
  const agentPublicKey = store.get("agentPublicKey");

  if (!token || !agentPublicKey) {
    throw new Error("Missing session or agent key");
  }

  try {
    await axios.post(
      `${store.get("apiUrl")}/providers/agent/connect`,
      {
        providerId,
        agentPublicKey,
        agentVersion: app.getVersion(),
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (err: any) {
    if (err.response?.status !== 409) {
      throw err;
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#09090e",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow!.show();
    mainWindow!.webContents.openDevTools(); // auto-opens devtools
  });
  // Minimize to tray instead of closing
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow!.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.zan.provider-agent");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();
  trayController = setupTray(mainWindow!, heartbeat);

  // ── Generate keypair on first launch if not exists ──
  if (!store.get("agentPrivateKey")) {
    const { privateKey, publicKey } = generateAgentKeypair();
    store.set("agentPrivateKey", privateKey);
    store.set("agentPublicKey", publicKey);
    console.log("[Agent] Keypair generated");
  }

  // Resume session if already registered
  if (store.get("providerId") && store.get("token")) {
    heartbeat.start();
    connectWebSocket(mainWindow);
  }

  app.on("activate", () => {
    mainWindow?.show();
  });
});

// Prevent full quit — keep in tray
app.on("window-all-closed", () => {
  // Keep running
});

// ─── AUTH ──────────────────────────────────────────────────────────

ipcMain.handle("auth:login", async (_, { email, password }) => {
  try {
    const url = `${store.get("apiUrl")}/auth/login`;
    console.log("[Login] Hitting URL:", url);

    const { data } = await axios.post(url, {
      email,
      password,
    });
    console.log("[Login] Response:", data);
    store.set("token", data.token);
    store.set("userId", data.userId);

    // Check if this user already has a registered machine
    let provider: any = null;
    try {
      const provRes = await axios.get(`${store.get("apiUrl")}/providers/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      provider = provRes.data.provider;
      if (provider) {
        store.set("providerId", provider.id);
        store.set("machineRegistered", true);
        if (!provider.agentPublicKey) {
          await ensureAgentConnected(provider.id);
        }
        heartbeat.start();
        connectWebSocket(mainWindow);
        trayController?.update();
      }
    } catch {
      // No provider yet — fine
    }

    return { success: true, user: data.user, provider };
  } catch (err: any) {
    console.log("[Login] Error:", err.response?.status, err.response?.data);
    return {
      success: false,
      error: err.response?.data?.error ?? "Login failed",
    };
  }
});

ipcMain.handle("auth:register", async (_, { name, email, password }) => {
  try {
    const { data } = await axios.post(`${store.get("apiUrl")}/auth/register`, {
      name,
      email,
      password,
    });
    store.set("token", data.token);
    store.set("userId", data.userId);
    return { success: true, user: data.user };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error ?? "Registration failed",
    };
  }
});

ipcMain.handle("auth:logout", async () => {
  heartbeat.stop();
  disconnectWebSocket();
  store.set("token", null);
  store.set("userId", null);
  store.set("providerId", null);
  store.set("machineRegistered", false);
  trayController?.update();
  return { success: true };
});

ipcMain.handle("auth:get-session", async () => {
  const token = store.get("token");
  if (!token) return { user: null, provider: null };
  try {
    const { data } = await axios.get(`${store.get("apiUrl")}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const providerId = store.get("providerId");
    let provider: any = null;
    if (providerId) {
      const provRes = await axios.get(
        `${store.get("apiUrl")}/providers/${providerId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      provider = provRes.data.provider;
      if (provider && !provider.agentPublicKey) {
        await ensureAgentConnected(provider.id);
        const refreshedProvRes = await axios.get(
          `${store.get("apiUrl")}/providers/${providerId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        provider = refreshedProvRes.data.provider;
      }
    }
    return { user: data.user, provider };
  } catch {
    return { user: null, provider: null };
  }
});

ipcMain.handle("auth:update-wallet", async (_, { walletAddress }) => {
  try {
    const token = store.get("token");
    const { data } = await axios.patch(
      `${store.get("apiUrl")}/auth/wallet`,
      { walletAddress },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return { success: true, user: data.user };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error ?? "Failed to update wallet",
    };
  }
});

// ─── MACHINE ───────────────────────────────────────────────────────

ipcMain.handle("machine:detect", async (event) => {
  return await detectHardware((step) => {
    event.sender.send("machine:detect-step", step);
  });
});

ipcMain.handle(
  "machine:register",
  async (_, { hardwareInfo, pricePerHour, stakeSignature, stakedAmount }) => {
    try {
      const token = store.get("token");
      const url = `${store.get("apiUrl")}/providers/register`;
      console.log("[MACHINE] Hitting URL:", url);
      const { data } = await axios.post(
        url,
        { hardwareInfo, pricePerHour, stakeSignature, stakedAmount },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      console.log("[MACHINE] Response:", data);
      store.set("providerId", data.providerId);
      store.set("machineRegistered", true);
      await ensureAgentConnected(data.providerId);
      heartbeat.start();
      connectWebSocket(mainWindow);
      trayController?.update();
      return { success: true, providerId: data.providerId };
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.data?.error ?? "Registration failed",
      };
    }
  },
);

// ─── PROVIDER ──────────────────────────────────────────────────────

ipcMain.handle("provider:set-status", async (_, { status }) => {
  try {
    const data = await agentRequest("patch", "/providers/status", { status });
    if (status === "ACTIVE") {
      heartbeat.start();
      connectWebSocket(mainWindow);
    } else {
      heartbeat.stop();
      disconnectWebSocket();
    }
    return { success: true, provider: data.provider };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.error ?? "Failed to update status",
    };
  }
});

ipcMain.handle("provider:get-stats", async () => {
  try {
    const data = await agentRequest("get", "/providers/stats");
    return { success: true, ...data };
  } catch {
    return { success: false };
  }
});

ipcMain.handle("store:get", (_, key: string) => store.get(key as any));

ipcMain.handle("app:open-external", (_, url: string) => shell.openExternal(url));

ipcMain.handle("app:get-verify-url", () => {
  const token = store.get("token");
  return `http://localhost:3000/wallet?token=${token}`;
});
