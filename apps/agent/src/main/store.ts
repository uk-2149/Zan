import * as fs from "fs";
import * as path from "path";
import ElectronStore from "electron-store";

interface StoreSchema {
  providerId: string | null;
  userId: string | null;
  token: string | null;
  agentPublicKey: string | null;
  agentPrivateKey: string | null;
  currentJobId: string | null;
  apiUrl: string;
  machineRegistered: boolean;
}

const Store =
  (ElectronStore as typeof ElectronStore & { default?: typeof ElectronStore })
    .default ?? ElectronStore;

function loadDotEnv(): void {
  const candidates = [
    path.resolve(process.resourcesPath, ".env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(process.cwd(), "apps/agent/.env"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const contents = fs.readFileSync(envPath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }

    break;
  }
}

loadDotEnv();

const api_url = process.env.API_URL || "http://localhost:3001/api";

export const store = new Store<StoreSchema>({
  defaults: {
    providerId: null,
    userId: null,
    token: null,
    agentPublicKey: null,
    agentPrivateKey: null,
    currentJobId: null,
    apiUrl: api_url,
    machineRegistered: false,
  },
});

if (process.env.API_URL && store.get("apiUrl") !== process.env.API_URL) {
  store.set("apiUrl", process.env.API_URL);
}
