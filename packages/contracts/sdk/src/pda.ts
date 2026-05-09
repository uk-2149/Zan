import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export const CONFIG_SEED = Buffer.from("config");
export const PROVIDER_STAKE_SEED = Buffer.from("provider_stake");
export const PROVIDER_VAULT_SEED = Buffer.from("provider_vault");
export const JOB_ESCROW_SEED = Buffer.from("job_escrow");
export const JOB_VAULT_SEED = Buffer.from("job_vault");
export const PLATFORM_TREASURY_SEED = Buffer.from("platform_treasury");

export function getConfigPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId)[0];
}

export function getPlatformTreasuryPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([PLATFORM_TREASURY_SEED], programId)[0];
}

export function getProviderStakePda(programId: PublicKey, provider: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([PROVIDER_STAKE_SEED, provider.toBuffer()], programId)[0];
}

export function getProviderVaultPda(programId: PublicKey, provider: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([PROVIDER_VAULT_SEED, provider.toBuffer()], programId)[0];
}

export function getJobEscrowPda(programId: PublicKey, jobId: BN): PublicKey {
  return PublicKey.findProgramAddressSync([JOB_ESCROW_SEED, jobId.toArrayLike(Buffer, "le", 8)], programId)[0];
}

export function getJobVaultPda(programId: PublicKey, jobId: BN): PublicKey {
  return PublicKey.findProgramAddressSync([JOB_VAULT_SEED, jobId.toArrayLike(Buffer, "le", 8)], programId)[0];
}
