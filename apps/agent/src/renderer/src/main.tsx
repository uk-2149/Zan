import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

declare global {
  interface Window {
    api: {
      login: (email: string, password: string) => Promise<any>;
      register: (name: string, email: string, password: string) => Promise<any>;
      logout: () => Promise<any>;
      getSession: () => Promise<any>;
      detectMachine: () => Promise<any>;
      registerMachine: (payload: any) => Promise<any>;
      setStatus: (status: string) => Promise<any>;
      getStats: () => Promise<any>;
      getStoreValue: (key: string) => Promise<any>;
      onDetectStep: (cb: (step: any) => void) => () => void;
      onJobAssigned: (cb: (job: any) => void) => () => void;
      onJobCancelled: (cb: (p: any) => void) => () => void;
      onJobFinished: (cb: (p: any) => void) => () => void;
      onWsStatus: (cb: (status: string) => void) => () => void;
      updateWallet: (walletAddress: string) => Promise<any>;
      getWalletBalance: () => Promise<any>;
      openExternal: (url: string) => Promise<any>;
      getVerifyUrl: () => Promise<string>;
    };
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
