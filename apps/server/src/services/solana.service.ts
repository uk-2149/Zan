import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import BN from "bn.js";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { EscrowIDL, getConfigPda, getJobEscrowPda, getJobVaultPda, getPlatformTreasuryPda, getProviderStakePda, getProviderVaultPda } from "@repo/contracts-sdk";
import type { Escrow } from "@repo/contracts-sdk";
import bs58 from "bs58";
import { ESCROW_PROGRAM_ID, SOLANA_AUTHORITY_KEYPAIR, SOLANA_RPC_URL } from "../env.js";

function loadKeypair(secret: string): Keypair {
  try {
    if (secret.startsWith("[")) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
    }
    return Keypair.fromSecretKey(bs58.decode(secret));
  } catch (err) {
    throw new Error("Failed to load SOLANA_AUTHORITY_KEYPAIR. Must be base58 or JSON array.");
  }
}

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const authorityKeypair = loadKeypair(SOLANA_AUTHORITY_KEYPAIR);
const wallet = new Wallet(authorityKeypair);
const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
const programId = new PublicKey(ESCROW_PROGRAM_ID);
const program = new Program<Escrow>(EscrowIDL as any, provider);

const configPda = getConfigPda(programId);
const platformTreasuryPda = getPlatformTreasuryPda(programId);

export async function verifyStakeTransaction(
    txSig: string,
    expectedProvider: string,
    minAmountLamports: number = 2_000_000_000
  ): Promise<boolean> {
    try {
      const tx = await connection.getTransaction(txSig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || tx.meta?.err) {
        return false;
      }

      // Instead of deep parsing the anchor instructions, we can just fetch the on-chain stake PDA
      // and verify its total_staked_lamports >= minAmountLamports and provider == expectedProvider
      // This is much safer and easier than trying to parse the transaction.
      const providerPubkey = new PublicKey(expectedProvider);
      const stakePda = getProviderStakePda(programId, providerPubkey);
      const state = await program.account.providerStake.fetch(stakePda);

      if (state.provider.toBase58() !== expectedProvider) return false;
      if (state.totalStakedLamports.toNumber() < minAmountLamports) return false;

      return true;
    } catch (err) {
      console.error("[SolanaService] verifyStakeTransaction failed", err);
      return false;
    }
  }

  export async function verifyJobEscrow(
    jobIdNum: number,
    expectedClient: string,
    expectedAmountLamports: number
  ): Promise<boolean> {
    try {
      const state = await getJobEscrowState(jobIdNum);
      if (!state) return false;
      if (state.client.toBase58() !== expectedClient) return false;
      if (state.depositLamports.toNumber() < expectedAmountLamports) return false;
      return true;
    } catch (err) {
      console.error("[SolanaService] verifyJobEscrow failed", err);
      return false;
    }
  }

  export async function assignProviderToEscrow(jobIdNum: number, providerWallet: string): Promise<string> {
    const jobId = new BN(jobIdNum);
    const jobEscrowPda = getJobEscrowPda(programId, jobId);
    const provider = new PublicKey(providerWallet);

    const tx = await program.methods
      .assignProviderToEscrow(provider)
      .accounts({
        authority: authorityKeypair.publicKey,
        config: configPda,
        jobEscrow: jobEscrowPda,
      } as any)
      .rpc();

    return tx;
  }

  export async function settleJob(
    jobIdNum: number,
    actualCostLamports: number,
    providerWallet: string,
    clientWallet: string
  ): Promise<string> {
    const jobId = new BN(jobIdNum);
    const jobEscrowPda = getJobEscrowPda(programId, jobId);
    const jobVaultPda = getJobVaultPda(programId, jobId);

    const tx = await program.methods
      .settleJob(new BN(actualCostLamports))
      .accounts({
        authority: authorityKeypair.publicKey,
        config: configPda,
        jobEscrow: jobEscrowPda,
        jobVault: jobVaultPda,
        providerWallet: new PublicKey(providerWallet),
        clientWallet: new PublicKey(clientWallet),
        platformTreasury: platformTreasuryPda,
        systemProgram: SystemProgram.programId, // Not really needed for Anchor, but required by struct
      } as any)
      .rpc();

    return tx;
  }

  export async function refundJob(jobIdNum: number, clientWallet: string): Promise<string> {
    const jobId = new BN(jobIdNum);
    const jobEscrowPda = getJobEscrowPda(programId, jobId);
    const jobVaultPda = getJobVaultPda(programId, jobId);

    const tx = await program.methods
      .refundJob()
      .accounts({
        authority: authorityKeypair.publicKey,
        config: configPda,
        jobEscrow: jobEscrowPda,
        jobVault: jobVaultPda,
        clientWallet: new PublicKey(clientWallet),
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    return tx;
  }

  export async function slashProviderStake(
    providerWallet: string,
    amountLamports: number,
    evidenceHashStr: string,
    evidenceUri: string,
    jobIdNum: number
  ): Promise<string> {
    const provider = new PublicKey(providerWallet);
    const providerStakePda = getProviderStakePda(programId, provider);
    const providerVaultPda = getProviderVaultPda(programId, provider);
    
    let evidenceHash = new Uint8Array(32);
    try {
      if (evidenceHashStr) {
         const decoded = bs58.decode(evidenceHashStr);
         if (decoded.length <= 32) {
           evidenceHash.set(decoded);
         }
      }
    } catch (e) {}

    const tx = await program.methods
      .slashProviderStake(
        new BN(amountLamports), 
        Array.from(evidenceHash), 
        evidenceUri, 
        new BN(jobIdNum)
      )
      .accounts({
        authority: authorityKeypair.publicKey,
        config: configPda,
        providerStake: providerStakePda,
        provider,
        providerVault: providerVaultPda,
        platformTreasury: platformTreasuryPda,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    return tx;
  }

  export async function getJobEscrowState(jobIdNum: number): Promise<any> {
    const jobId = new BN(jobIdNum);
    const jobEscrowPda = getJobEscrowPda(programId, jobId);
    try {
      const state = await program.account.jobEscrow.fetch(jobEscrowPda);
      return state;
    } catch {
      return null;
    }
}

