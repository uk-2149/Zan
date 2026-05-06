"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import bs58 from "bs58";
import { useRouter, useSearchParams } from "next/navigation";

function WalletVerificationContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const { publicKey, signMessage, connected } = useWallet();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated" && !token) {
      router.push("/login?callbackUrl=/wallet");
    }
  }, [status, token, router]);

  const handleVerify = async () => {
    if (!publicKey || !signMessage) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiBase = token ? "http://localhost:3001/api/auth" : "/api/auth";
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. Get challenge
      const chalRes = await fetch(`${apiBase}/wallet/challenge`, { headers });
      if (!chalRes.ok) {
        const d = await chalRes.json().catch(()=>({}));
        throw new Error(d.error || "Failed to get challenge");
      }
      const { message } = await chalRes.json();

      // 2. Sign message
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);

      // 3. Verify
      const verRes = await fetch(`${apiBase}/wallet`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          signature: signatureBase58,
          message,
        }),
      });

      const verData = await verRes.json().catch(()=>({}));
      if (!verRes.ok) throw new Error(verData.error || "Verification failed");

      setSuccess(true);
      setTimeout(() => {
        if (!token) {
          const role = (session?.user as any)?.role;
          router.push(role === "PROVIDER" ? "/provider" : "/client");
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || (status === "unauthenticated" && !token)) return null;

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center relative overflow-hidden px-6 pt-20">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-brand-cyan/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="rounded-3xl border border-white/10 bg-brand-gray/50 backdrop-blur-2xl p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-cyan to-transparent opacity-50" />

          <div className="text-center mb-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-brand-cyan/20 flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-brand-cyan" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Verify Wallet
            </h1>
            <p className="text-white/50 font-light">
              Prove ownership of your Solana wallet to link it to your Zan account.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-green-400 mb-2">Wallet Verified</h3>
                <p className="text-green-400/70 text-sm">
                  Your wallet has been securely linked. You can safely close this page or wait to be redirected...
                </p>
              </motion.div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-4 bg-black/30 p-6 rounded-2xl border border-white/5">
                  <p className="text-sm text-white/60 text-center mb-2">
                    Step 1: Connect your Solana wallet
                  </p>
                  <WalletMultiButton style={{ backgroundColor: "#00ffd1", color: "#09090e", borderRadius: "9999px", fontWeight: "bold" }} />
                </div>

                {connected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex flex-col gap-4"
                  >
                    <button
                      onClick={handleVerify}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Step 2: Sign Message to Verify"
                      )}
                    </button>
                    <p className="text-xs text-center text-white/40">
                      Signing this message is free and will not cost any SOL.
                    </p>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function WalletVerificationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-dark flex items-center justify-center text-white/50">Loading verification...</div>}>
      <WalletVerificationContent />
    </Suspense>
  );
}
