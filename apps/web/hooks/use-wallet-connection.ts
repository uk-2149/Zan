"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { api } from "@/lib/api";

export function useWalletConnection() {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!publicKey || !connected) return;

    const saveWallet = async () => {
      setSaving(true);
      try {
        await api.patch("/api/auth/wallet", {
          walletAddress: publicKey.toBase58(),
        });
      } catch {
        // non-fatal
      }
      setSaving(false);
    };

    saveWallet();
  }, [publicKey, connected]);

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
    disconnect,
  };
}
