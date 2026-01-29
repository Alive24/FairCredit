import { createSolanaRpc } from "@solana/kit";
import { address } from "@solana/kit";
import { fetchMaybeHub } from "../app/lib/solana/generated/accounts";

async function testHubDecoder() {
  const rpcUrl = "https://api.devnet.solana.com";
  const rpc = createSolanaRpc(rpcUrl);

  const hubPDA = address("GPftMStJZ5h7uvM5FwZXHwxm7DBv6YdPtDDWRYcnpqKf");

  console.log("Fetching hub account...");
  const hubAccount = await fetchMaybeHub(rpc, hubPDA);

  if (!hubAccount.exists || !hubAccount.data) {
    console.log("Hub account not found");
    return;
  }

  console.log("\n=== Hub Data ===");
  console.log("Authority:", hubAccount.data.authority);
  console.log("Accepted Providers:", hubAccount.data.acceptedProviders.length);
  hubAccount.data.acceptedProviders.forEach((provider: string, i: number) => {
    console.log(`  ${i + 1}. ${provider}`);
  });
  console.log("Accepted Courses:", hubAccount.data.acceptedCourses.length);
  hubAccount.data.acceptedCourses.forEach((course: string, i: number) => {
    console.log(`  ${i + 1}. ${course}`);
  });
  console.log("Accepted Endorsers:", hubAccount.data.acceptedEndorsers.length);
  hubAccount.data.acceptedEndorsers.forEach((endorser: string, i: number) => {
    console.log(`  ${i + 1}. ${endorser}`);
  });
}

testHubDecoder().catch(console.error);
