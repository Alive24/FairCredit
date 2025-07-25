import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { PROGRAM_ID, getHubPDA, getProviderPDA } from "../app/lib/solana/config";

// Instruction discriminator for add_accepted_provider
const ADD_ACCEPTED_PROVIDER = Buffer.from([254, 208, 75, 70, 237, 107, 97, 207]);

async function addProviderToHub(providerWallet: string) {
  // Hub authority keypair - from the base58 private key you provided
  const bs58 = require("bs58");
  const secretKey = bs58.decode("5mdcUteXC3qhj8pvNQx765xuXPbU9KutBZabqsmn36YuKzf3wZDECSVAN3XyhuAfhQbGENS3MUUKiZimncdm4t8q");
  const hubAuthorityKeypair = Keypair.fromSecretKey(secretKey);

  console.log("Hub authority:", hubAuthorityKeypair.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  const providerWalletPubkey = new PublicKey(providerWallet);
  const [hubPDA] = getHubPDA();
  const [providerPDA] = getProviderPDA(providerWalletPubkey);

  console.log("Adding provider to hub:");
  console.log("- Provider wallet:", providerWallet);
  console.log("- Provider PDA:", providerPDA.toBase58());
  console.log("- Hub PDA:", hubPDA.toBase58());

  try {
    // Create the instruction
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: hubPDA, isSigner: false, isWritable: true },
        { pubkey: hubAuthorityKeypair.publicKey, isSigner: true, isWritable: false }, // authority
        { pubkey: providerPDA, isSigner: false, isWritable: false }, // provider PDA
        { pubkey: providerWalletPubkey, isSigner: false, isWritable: false }, // provider_wallet
      ],
      data: ADD_ACCEPTED_PROVIDER,
    });

    const transaction = new Transaction().add(instruction);
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = hubAuthorityKeypair.publicKey;
    
    // Sign and send
    transaction.sign(hubAuthorityKeypair);
    const signature = await connection.sendTransaction(transaction, [hubAuthorityKeypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    console.log("Transaction sent:", signature);
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');
    
    console.log("Provider added to hub successfully!");

    // Verify by checking hub state
    const accountInfo = await connection.getAccountInfo(hubPDA);
    if (accountInfo) {
      console.log("\nHub account data length:", accountInfo.data.length);
    }

  } catch (error) {
    console.error("Error adding provider to hub:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

// Add your wallet as a provider
const yourWallet = "F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs";
addProviderToHub(yourWallet).catch(console.error);