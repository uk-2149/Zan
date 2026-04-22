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

export const store = new Store<StoreSchema>({
  defaults: {
    providerId: null,
    userId: null,
    token: null,
    agentPublicKey: null,
    agentPrivateKey: null,
    currentJobId: null,
    apiUrl: "http://localhost:3001/api",
    machineRegistered: false,
  },
});