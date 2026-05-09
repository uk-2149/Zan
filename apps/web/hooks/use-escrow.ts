import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { EscrowIDL, getConfigPda, getJobEscrowPda, getJobVaultPda } from "@repo/contracts-sdk";
import type { Escrow } from "@repo/contracts-sdk";

const ESCROW_PROGRAM_ID = process.env.NEXT_PUBLIC_ESCROW_PROGRAM_ID || "G4AGRutZdKry9rMnJiZt2Noz42ifwghgZxiXCETfXHGg";

export function useEscrow() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const programId = new PublicKey(ESCROW_PROGRAM_ID);
  
  // We use any for wallet because anchor expects a slightly different Wallet interface,
  // but it works fine with the wallet-adapter output.
  const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
  const program = new Program<Escrow>(EscrowIDL as any, provider);

  const createJobEscrow = async (jobNumericId: string, depositLamports: number) => {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    const jobId = new BN(jobNumericId);
    const configPda = getConfigPda(programId);
    const jobEscrowPda = getJobEscrowPda(programId, jobId);
    const jobVaultPda = getJobVaultPda(programId, jobId);

    const tx = await program.methods
      .createJobEscrow(jobId, new BN(depositLamports))
      .accounts({
        client: wallet.publicKey,
        config: configPda,
        jobEscrow: jobEscrowPda,
        jobVault: jobVaultPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    return tx;
  };

  return { createJobEscrow };
}
