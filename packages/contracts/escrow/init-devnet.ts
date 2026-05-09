import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "./target/types/escrow";

async function main() {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  
  // This reads the IDL and program ID from your workspace
  const program = anchor.workspace.Escrow as Program<Escrow>;

  console.log("Using wallet:", provider.wallet.publicKey.toBase58());
  console.log("Program ID:", program.programId.toBase58());

  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  const [platformTreasuryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("platform_treasury")],
    program.programId
  );

  console.log("Initializing config at PDA:", configPda.toBase58());
  console.log("Initializing platform treasury at PDA:", platformTreasuryPda.toBase58());

  const initializeTreasury = async () => {
    const tx = await program.methods
      .initializePlatformTreasury()
      .accounts({
        authority: provider.wallet.publicKey,
        config: configPda,
        platformTreasury: platformTreasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();
    console.log("Platform treasury initialized! Transaction signature:", tx);
  };

  try {
    const tx = await program.methods
      .initializeConfig(
        provider.wallet.publicKey, // authority
        1000, // 10% platform fee
        new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL) // 2 SOL max deposit
      )
      .accounts({
        authority: provider.wallet.publicKey,
        config: configPda,
        platformTreasury: platformTreasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Config initialized! Transaction signature:", tx);
    await initializeTreasury();
  } catch (err: any) {
    if (err.message.includes("already in use")) {
      console.log("Config is already initialized! You are good to go.");
      await initializeTreasury();
    } else {
      console.error("Error initializing config:", err);
    }
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
