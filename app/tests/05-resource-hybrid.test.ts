import { expect } from "chai";
import type { Address } from "@solana/kit";
import { getTestContext, type TestContext } from "./setup/test-context";
import { sendInstructions, getCoursePDA } from "./utils/test-helpers";
import { getCreateCourseInstructionAsync } from "../lib/solana/generated/instructions/createCourse";
import { getAddResourceInstructionAsync } from "../lib/solana/generated/instructions/addResource";
import { getSetResourceNostrRefInstruction } from "../lib/solana/generated/instructions/setResourceNostrRef";
import { getSetResourceWalrusRefInstruction } from "../lib/solana/generated/instructions/setResourceWalrusRef";
import { getCreateAssetInstructionAsync } from "../lib/solana/generated/instructions/createAsset";
import { getSetAssetNostrRefInstruction } from "../lib/solana/generated/instructions/setAssetNostrRef";
import { getSetAssetWalrusRefInstruction } from "../lib/solana/generated/instructions/setAssetWalrusRef";
import { fetchResource } from "../lib/solana/generated/accounts/resource";
import { fetchAsset } from "../lib/solana/generated/accounts/asset";
import { ResourceKind } from "../lib/solana/generated/types/resourceKind";

describe("Resource Hybrid Storage", () => {
  let ctx: TestContext;
  let coursePDA: string;
  let resourcePDA: string;
  let assetPDA: string;

  before(async () => {
    ctx = await getTestContext();
    const courseTs = BigInt(Math.floor(Date.now() / 1000));
    [coursePDA] = await getCoursePDA(ctx.hubPDA, ctx.providerPDA, courseTs);
    const createCourseIx = await getCreateCourseInstructionAsync({
      course: coursePDA,
      provider: ctx.providerPDA,
      hub: ctx.hubPDA,
      providerAuthority: ctx.providerWallet,
      creationTimestamp: courseTs,
      name: "Hybrid Storage Course",
      description: "Course for resource hybrid storage flow",
      workloadRequired: 50,
      degreeId: null,
    });
    await sendInstructions(ctx.rpcUrl, [createCourseIx], ctx.providerWallet);
    await sleep(1000);
  });

  it("Should create a resource and bind nostr/walrus refs", async () => {
    const addResourceIx = await getAddResourceInstructionAsync({
      resource: undefined,
      course: coursePDA,
      provider: ctx.providerPDA,
      hub: ctx.hubPDA,
      providerAuthority: ctx.providerWallet,
      creationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
      kind: ResourceKind.General,
      name: "Hybrid Assignment",
      externalId: null,
      workload: null,
      tags: ["hybrid", "nostr"],
    });
    resourcePDA = addResourceIx.accounts[0].address;
    await sendInstructions(ctx.rpcUrl, [addResourceIx], ctx.providerWallet);
    await sleep(1000);

    const nostrIx = await getSetResourceNostrRefInstruction({
      resource: resourcePDA,
      authority: ctx.providerWallet,
      nostrDTag: "faircredit:resource:nostr-test",
      nostrAuthorPubkey: toBytes32("nostr-author"),
      force: true,
    });
    await sendInstructions(ctx.rpcUrl, [nostrIx], ctx.providerWallet);
    await sleep(1000);

    const walrusIx = await getSetResourceWalrusRefInstruction({
      resource: resourcePDA,
      authority: ctx.providerWallet,
      walrusBlobId: "walrus-blob-123",
    });
    await sendInstructions(ctx.rpcUrl, [walrusIx], ctx.providerWallet);
    await sleep(1000);

    const resource = await fetchResource(ctx.rpc, resourcePDA);
    expect(resource.data.nostrDTag.__option).to.equal("Some");
    expect((resource.data.nostrDTag as any).value).to.equal(
      "faircredit:resource:nostr-test"
    );
    expect(resource.data.walrusBlobId.__option).to.equal("Some");
    expect((resource.data.walrusBlobId as any).value).to.equal(
      "walrus-blob-123"
    );
  });

  it("Should create an asset and update hybrid refs", async () => {
    const createAssetIx = await getCreateAssetInstructionAsync({
      asset: undefined,
      owner: ctx.providerWallet,
      creationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
      contentType: some("application/pdf"),
      fileName: some("hybrid.pdf"),
      fileSize: some(BigInt(1024)),
      resource: some(resourcePDA),
    });
    assetPDA = createAssetIx.accounts[0].address;
    await sendInstructions(ctx.rpcUrl, [createAssetIx], ctx.providerWallet);
    await sleep(1000);

    const assetNostrIx = await getSetAssetNostrRefInstruction({
      asset: assetPDA,
      authority: ctx.providerWallet,
      nostrDTag: "faircredit:asset:nostr",
      nostrAuthorPubkey: toBytes32("npub-hybrid"),
      force: true,
    });
    await sendInstructions(ctx.rpcUrl, [assetNostrIx], ctx.providerWallet);
    await sleep(1000);

    const assetWalrusIx = await getSetAssetWalrusRefInstruction({
      asset: assetPDA,
      authority: ctx.providerWallet,
      walrusBlobId: "asset-blob-456",
    });
    await sendInstructions(ctx.rpcUrl, [assetWalrusIx], ctx.providerWallet);
    await sleep(1000);

    const assetAccount = await fetchAsset(ctx.rpc, assetPDA);
    expect(assetAccount.data.nostrDTag.__option).to.equal("Some");
    expect((assetAccount.data.nostrDTag as any).value).to.equal(
      "faircredit:asset:nostr"
    );
    expect(assetAccount.data.walrusBlobId.__option).to.equal("Some");
    expect((assetAccount.data.walrusBlobId as any).value).to.equal(
      "asset-blob-456"
    );
  });
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function some<T>(value: T) {
  return { __option: "Some" as const, value };
}

function toBytes32(text: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const out = new Uint8Array(32);
  out.set(bytes.slice(0, 32));
  return out;
}
