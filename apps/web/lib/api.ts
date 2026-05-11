import { getSession } from "next-auth/react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await getSession();
  const token = (session as any)?.accessToken ?? (session as any)?.user?.token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  async get(path: string) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: await getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getText(path: string) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: await getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },

  async getBlob(path: string) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: await getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },

  async post(path: string, body: any) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async patch(path: string, body: any) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
