import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  // ── Auth ──────────────────────────────────────────
  login: (email: string, password: string) =>
    ipcRenderer.invoke("auth:login", { email, password }),

  register: (name: string, email: string, password: string) =>
    ipcRenderer.invoke("auth:register", { name, email, password }),

  logout: () => ipcRenderer.invoke("auth:logout"),

  getSession: () => ipcRenderer.invoke("auth:get-session"),

  // ── Machine ───────────────────────────────────────
  detectMachine: () => ipcRenderer.invoke("machine:detect"),

  registerMachine: (payload: {
    hardwareInfo: any;
    pricePerHour: number;
    stakeSignature: string;
    stakedAmount: number;
    walletAddress: string;
  }) => ipcRenderer.invoke("machine:register", payload),

  // ── Provider ──────────────────────────────────────
  setStatus: (status: string) =>
    ipcRenderer.invoke("provider:set-status", { status }),

  getStats: () => ipcRenderer.invoke("provider:get-stats"),

  getStoreValue: (key: string) => ipcRenderer.invoke("store:get", key),

  // ── Events from main → renderer ───────────────────
  onDetectStep: (cb: (step: any) => void) => {
    const handler = (_: any, step: any) => cb(step);
    ipcRenderer.on("machine:detect-step", handler);
    return () => ipcRenderer.removeListener("machine:detect-step", handler);
  },

  onJobAssigned: (cb: (job: any) => void) => {
    const handler = (_: any, job: any) => cb(job);
    ipcRenderer.on("job-assigned", handler);
    return () => ipcRenderer.removeListener("job-assigned", handler);
  },

  onJobCancelled: (cb: (payload: any) => void) => {
    const handler = (_: any, payload: any) => cb(payload);
    ipcRenderer.on("job-cancelled", handler);
    return () => ipcRenderer.removeListener("job-cancelled", handler);
  },
  onJobFinished: (cb: (payload: any) => void) => {
    const handler = (_: any, payload: any) => cb(payload);
    ipcRenderer.on("job-finished", handler);
    return () => ipcRenderer.removeListener("job-finished", handler);
  },

  updateWallet: (walletAddress: string) =>
    ipcRenderer.invoke("auth:update-wallet", { walletAddress }),

  onWsStatus: (cb: (status: "connected" | "disconnected") => void) => {
    const handler = (_: any, status: string) => cb(status as any);
    ipcRenderer.on("ws-status", handler);
    return () => ipcRenderer.removeListener("ws-status", handler);
  },

  openExternal: (url: string) => ipcRenderer.invoke("app:open-external", url),
  getVerifyUrl: () => ipcRenderer.invoke("app:get-verify-url"),
  getWalletBalance: () => ipcRenderer.invoke("wallet:get-balance"),
});
