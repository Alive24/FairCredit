import { expect } from "chai";
import { getInitializeProviderInstructionAsync } from "../lib/solana/generated/instructions/initializeProvider";
import { fetchProvider } from "../lib/solana/generated/accounts/provider";
import { getTestContext, type TestContext } from "./setup/test-context";
import { sendInstructions } from "./utils/test-helpers";

describe("Provider Management", () => {
  let ctx: TestContext;

  before(async () => {
    ctx = await getTestContext();
  });

  it("Should initialize a provider", async () => {
    const instruction = await getInitializeProviderInstructionAsync({
      providerAccount: ctx.providerPDA,
      providerAuthority: ctx.providerWallet,
      name: "Tech Academy",
      description: "Leading technology education provider",
      website: "https://techacademy.com",
      email: "contact@techacademy.com",
      providerType: "education",
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.providerWallet
    );
    console.log("Provider initialized:", tx);

    await sleep(1000);

    const providerAccount = await fetchProvider(ctx.rpc, ctx.providerPDA);
    expect(providerAccount.data.name).to.equal("Tech Academy");
    expect(providerAccount.data.wallet).to.equal(ctx.providerWallet.address);
  });
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
