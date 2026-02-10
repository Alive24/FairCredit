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
      ctx.providerWallet,
    );
    console.log("Provider initialized:", tx);

    await sleep(1000);

    const providerAccount = await fetchProvider(ctx.rpc, ctx.providerPDA);
    expect(providerAccount.data.name).to.equal("Tech Academy");
    expect(providerAccount.data.wallet).to.equal(ctx.providerWallet.address);
  });

  it("Should fail to initialize an already initialized provider", async () => {
    try {
      const instruction = await getInitializeProviderInstructionAsync({
        providerAccount: ctx.providerPDA,
        providerAuthority: ctx.providerWallet,
        name: "Tech Academy Duplicate",
        description: "Leading technology education provider",
        website: "https://techacademy.com",
        email: "contact@techacademy.com",
        providerType: "education",
      });

      await sendInstructions(ctx.rpcUrl, [instruction], ctx.providerWallet);
      expect.fail("Should have failed to initialize duplicate provider");
    } catch (error: any) {
      // The error might be a transaction simulation error or an AlreadyInUse error
      // Codama/web3.js errors can be verbose, but usually contain log info
      const message = String(error?.context?.logs ?? error);
      expect(message).to.include("already in use");
    }
  });
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
