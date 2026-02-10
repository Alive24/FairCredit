import { expect } from "chai";
import { fetchHub } from "../lib/solana/generated/accounts/hub";
import { getAddAcceptedProviderInstructionAsync } from "../lib/solana/generated/instructions/addAcceptedProvider";
import { getUpdateHubConfigInstructionAsync } from "../lib/solana/generated/instructions/updateHubConfig";
import { getTestContext, type TestContext } from "./setup/test-context";
import { sendInstructions } from "./utils/test-helpers";

describe("Hub Management", () => {
  let ctx: TestContext;

  before(async () => {
    ctx = await getTestContext();
  });

  it("Should have the hub initialized", async () => {
    const hubAccount = await fetchHub(ctx.rpc, ctx.hubPDA);
    expect(hubAccount.data.authority).to.equal(ctx.hubAuthority.address);
  });

  it("Should add accepted provider to hub", async () => {
    const instruction = await getAddAcceptedProviderInstructionAsync({
      hub: ctx.hubPDA,
      authority: ctx.hubAuthority,
      provider: ctx.providerPDA,
      providerWallet: ctx.providerWallet.address,
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.hubAuthority,
    );
    console.log("Provider added to hub:", tx);

    await sleep(1000);

    const hubAccount = await fetchHub(ctx.rpc, ctx.hubPDA);
    expect(hubAccount.data.acceptedProviders).to.have.lengthOf(1);
    expect(hubAccount.data.acceptedProviders[0]).to.equal(
      ctx.providerWallet.address,
    );
  });

  it("Should update hub configuration", async () => {
    const instruction = await getUpdateHubConfigInstructionAsync({
      hub: ctx.hubPDA,
      authority: ctx.hubAuthority,
      config: {
        requireProviderApproval: false,
        minReputationScore: BigInt(80),
      },
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.hubAuthority,
    );
    console.log("Hub config updated:", tx);

    await sleep(1000);

    const hubAccount = await fetchHub(ctx.rpc, ctx.hubPDA);
    expect(hubAccount.data.config.requireProviderApproval).to.be.false;
    expect(hubAccount.data.config.minReputationScore).to.equal(BigInt(80));
  });

  it("Should remove accepted provider from hub", async () => {
    const { getRemoveAcceptedProviderInstructionAsync } = await import(
      "../lib/solana/generated/instructions/removeAcceptedProvider"
    );

    const instruction = await getRemoveAcceptedProviderInstructionAsync({
      hub: ctx.hubPDA,
      authority: ctx.hubAuthority,
      providerWallet: ctx.providerWallet.address,
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.hubAuthority,
    );
    console.log("Provider removed from hub:", tx);
    await sleep(1000);

    const hubAccount = await fetchHub(ctx.rpc, ctx.hubPDA);
    expect(hubAccount.data.acceptedProviders).to.be.an("array").that.is.empty;
  });
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
