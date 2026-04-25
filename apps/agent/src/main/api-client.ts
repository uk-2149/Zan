// apps/agent/src/main/api-client.ts
import axios from "axios";
import { signMessage, buildMessage } from "@repo/crypto";
import { store } from "./store";

// Every API call from agent goes through this
// automatically attaches the signature
export async function agentRequest(
  method: "get" | "post" | "patch",
  path: string,
  body?: any,
) {
  const providerId = store.get("providerId");
  const privateKey = store.get("agentPrivateKey");
  const token = store.get("token");

  if (!providerId || !privateKey) {
    throw new Error("Agent not registered");
  }

  // Timestamp — server rejects anything older than 60s
  const timestamp = Date.now();
  const action = `/api${path}`.replace(/\//g, "_");
  const message = buildMessage(providerId, action, timestamp);
  const signature = signMessage(message, privateKey);

  const headers: any = {
    "x-agent-id": providerId,
    "x-agent-sig": signature,
    "x-agent-timestamp": String(timestamp),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${store.get("apiUrl")}${path}`;

  const response =
    method === "get"
      ? await axios.get(url, { headers, params: body })
      : await axios[method](url, body ?? {}, { headers });

  return response.data;
}
