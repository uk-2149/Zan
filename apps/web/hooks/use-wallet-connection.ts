"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { api } from "@/lib/api";

let globalVerifiedAddress: string | null = null;
let globalBlockedAddress: string | null = null;
let globalVerificationInFlight = false;

export function useWalletConnection() {
  const { publicKey, connected, connecting, disconnect, signMessage } =
    useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const lastVerifiedAddress = useRef<string | null>(null);
  const lastBlockedAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch {
        setBalance(null);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [publicKey, connected, connection]);

  useEffect(() => {
    if (!publicKey || !connected || !signMessage) return;

    const walletAddress = publicKey.toBase58();
    if (globalVerifiedAddress === walletAddress) {
      lastVerifiedAddress.current = walletAddress;
      return;
    }
    if (globalBlockedAddress === walletAddress) {
      lastBlockedAddress.current = walletAddress;
      return;
    }
    if (globalVerificationInFlight) return;
    if (lastVerifiedAddress.current === walletAddress) return;
    if (lastBlockedAddress.current === walletAddress) return;

    const saveWallet = async () => {
      setSaving(true);
      globalVerificationInFlight = true;
      try {
        const status = await api.get(
          `/api/auth/wallet/status?address=${encodeURIComponent(walletAddress)}`,
        );
        const linkedAddress = status?.linkedWalletAddress as string | null;
        const addressStatus = status?.addressStatus as
          | "linkedToCurrentUser"
          | "linkedToAnotherUser"
          | "unlinked"
          | undefined;

        if (linkedAddress && linkedAddress === walletAddress) {
          globalVerifiedAddress = walletAddress;
          lastVerifiedAddress.current = walletAddress;
          return;
        }

        if (addressStatus === "linkedToCurrentUser") {
          globalVerifiedAddress = walletAddress;
          lastVerifiedAddress.current = walletAddress;
          return;
        }

        if (addressStatus === "linkedToAnotherUser") {
          globalBlockedAddress = walletAddress;
          lastBlockedAddress.current = walletAddress;
          return;
        }

        const challenge = await api.get("/api/auth/wallet/challenge");
        const message = challenge?.message;
        if (!message) return;

        const encodedMessage = new TextEncoder().encode(message);
        const signature = await signMessage(encodedMessage);
        const signatureBase58 = bs58.encode(signature);

        await api.patch("/api/auth/wallet", {
          walletAddress,
          signature: signatureBase58,
          message,
        });
        globalVerifiedAddress = walletAddress;
        lastVerifiedAddress.current = walletAddress;
      } catch (err: any) {
        const message = typeof err?.message === "string" ? err.message : "";
        if (message.includes("Wallet already linked to another account")) {
          globalBlockedAddress = walletAddress;
          lastBlockedAddress.current = walletAddress;
        }
        // non-fatal
        return;
      } finally {
        globalVerificationInFlight = false;
        setSaving(false);
      }
    };

    saveWallet();
  }, [publicKey, connected, signMessage]);

  return {
    publicKey,
    connected,
    connecting,
    balance,
    saving,
    address: publicKey?.toBase58() ?? null,
    shortAddress: publicKey
      ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
      : null,
    disconnect: async () => {
      globalVerificationInFlight = false;
      globalVerifiedAddress = null;
      globalBlockedAddress = null;
      lastVerifiedAddress.current = null;
      lastBlockedAddress.current = null;
      await disconnect();
    },
  };
}
