"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWalletConnection } from "@/hooks/use-wallet-connection";

interface Props {
  className?: string;
  showBalance?: boolean;
}

export function WalletConnectButton({
  className = "",
  showBalance = true,
}: Props) {
  const { connected, connecting, balance, shortAddress } = useWalletConnection();
  const { setVisible } = useWalletModal();

  if (connecting) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/50 ${className}`}
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        Connecting...
      </button>
    );
  }

  if (connected && shortAddress) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {showBalance && balance !== null && (
          <span className="text-sm font-semibold text-white">
            ◎ {balance.toFixed(3)} SOL
          </span>
        )}
        <button
          onClick={() => setVisible(true)}
          className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm font-semibold text-green-400 transition-colors hover:bg-green-500/20"
        >
          <span className="h-2 w-2 rounded-full bg-green-400" />
          {shortAddress}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className={`flex items-center gap-2 rounded-xl bg-brand-cyan px-5 py-2.5 text-sm font-bold text-brand-dark transition-all hover:bg-white ${className}`}
    >
      <span>◎</span>
      Connect Wallet
    </button>
  );
}
