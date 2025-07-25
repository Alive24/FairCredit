import { Connection, PublicKey } from "@solana/web3.js";
import { decodeHubAccount } from "../app/lib/solana/hub-decoder";

async function testHubDecoder() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Hub PDA from your deployment
  const hubPDA = new PublicKey("GPftMStJZ5h7uvM5FwZXHwxm7DBv6YdPtDDWRYcnpqKf");
  
  console.log("Fetching hub account...");
  const accountInfo = await connection.getAccountInfo(hubPDA);
  
  if (!accountInfo) {
    console.log("Hub account not found");
    return;
  }
  
  console.log("Account data length:", accountInfo.data.length);
  console.log("Decoding hub data...");
  
  const hubData = decodeHubAccount(accountInfo.data);
  
  console.log("\n=== Hub Data ===");
  console.log("Authority:", hubData.authority?.toBase58() || "null");
  console.log("Accepted Providers:", hubData.acceptedProviders.length);
  hubData.acceptedProviders.forEach((provider, i) => {
    console.log(`  ${i + 1}. ${provider.toBase58()}`);
  });
  console.log("Accepted Courses:", hubData.acceptedCourses.length);
  hubData.acceptedCourses.forEach((course, i) => {
    console.log(`  ${i + 1}. ${course}`);
  });
  console.log("Accepted Endorsers:", hubData.acceptedEndorsers.length);
  hubData.acceptedEndorsers.forEach((endorser, i) => {
    console.log(`  ${i + 1}. ${endorser.toBase58()}`);
  });
}

testHubDecoder().catch(console.error);