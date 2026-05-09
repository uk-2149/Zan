import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { expect } from "chai";

describe("escrow", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.escrow as Program<Escrow>;

  const authority = provider.wallet;
  const platformTreasury = anchor.web3.Keypair.generate();
  
  const fakeProvider = anchor.web3.Keypair.generate();
  const client = anchor.web3.Keypair.generate();
  
  const jobId = new anchor.BN(1);

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId,
  );
  
  const [platformTreasuryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("platform_treasury")],
    program.programId,
  );
  
  const [providerStakePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("provider_stake"), fakeProvider.publicKey.toBuffer()],
    program.programId,
  );
  const [providerVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("provider_vault"), fakeProvider.publicKey.toBuffer()],
    program.programId,
  );
  const [jobEscrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("job_escrow"), jobId.toArrayLike(Buffer, "le", 8)],
    program.programId,
  );
  const [jobVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("job_vault"), jobId.toArrayLike(Buffer, "le", 8)],
    program.programId,
  );

  before(async () => {
    // Airdrop SOL to test accounts
    const sig1 = await provider.connection.requestAirdrop(fakeProvider.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    const sig2 = await provider.connection.requestAirdrop(client.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig1);
    await provider.connection.confirmTransaction(sig2);
  });

  it("initializes config", async () => {
    await program.methods
      .initializeConfig(authority.publicKey, 500, new anchor.BN(5_000_000_000))
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        platformTreasury: platformTreasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      
    const config = await program.account.config.fetch(configPda);
    expect(config.platformFeeBps).to.equal(500);
  });

  it("stakes provider", async () => {
    await program.methods
      .initializeProviderStake(new anchor.BN(2_000_000_000))
      .accounts({
        provider: fakeProvider.publicKey,
        config: configPda,
        providerStake: providerStakePda,
        providerVault: providerVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([fakeProvider])
      .rpc();
      
    const stake = await program.account.providerStake.fetch(providerStakePda);
    expect(stake.totalStakedLamports.toNumber()).to.equal(2_000_000_000);
  });

  it("creates a job escrow without a provider initially", async () => {
    await program.methods
      .createJobEscrow(jobId, new anchor.BN(100_000_000))
      .accounts({
        client: client.publicKey,
        config: configPda,
        jobEscrow: jobEscrowPda,
        jobVault: jobVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const escrow = await program.account.jobEscrow.fetch(jobEscrowPda);
    expect(escrow.depositLamports.toNumber()).to.equal(100_000_000);
    expect(escrow.provider).to.be.null;
  });
  
  it("assigns provider to job escrow", async () => {
    await program.methods
      .assignProviderToEscrow(fakeProvider.publicKey)
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        jobEscrow: jobEscrowPda,
      })
      .rpc();

    const escrow = await program.account.jobEscrow.fetch(jobEscrowPda);
    expect(escrow.provider?.toBase58()).to.equal(fakeProvider.publicKey.toBase58());
  });

  it("settles a job escrow", async () => {
    await program.methods
      .settleJob(new anchor.BN(60_000_000)) // 60M lamports cost
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        jobEscrow: jobEscrowPda,
        jobVault: jobVaultPda,
        providerWallet: fakeProvider.publicKey,
        clientWallet: client.publicKey,
        platformTreasury: platformTreasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const jobEscrow = await program.account.jobEscrow.fetch(jobEscrowPda);
    expect(jobEscrow.settledLamports.toNumber()).to.equal(60_000_000);
    
    // Fee is 500 bps (5%) of 60_000_000 = 3_000_000
    const treasuryBalance = await provider.connection.getBalance(platformTreasuryPda);
    expect(treasuryBalance).to.equal(3_000_000);
  });
  
  it("slashes provider stake", async () => {
    const evidenceHash = new Uint8Array(32);
    evidenceHash.fill(1);
    
    await program.methods
      .slashProviderStake(new anchor.BN(500_000_000), Array.from(evidenceHash), "ipfs://mock", new anchor.BN(1))
      .accounts({
        authority: authority.publicKey,
        config: configPda,
        providerStake: providerStakePda,
        provider: fakeProvider.publicKey,
        providerVault: providerVaultPda,
        platformTreasury: platformTreasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      
    const stake = await program.account.providerStake.fetch(providerStakePda);
    expect(stake.totalStakedLamports.toNumber()).to.equal(1_500_000_000);
    expect(stake.totalSlashedLamports.toNumber()).to.equal(500_000_000);
  });
});
