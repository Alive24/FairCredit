import { expect } from "chai";
import { getTestContext, type TestContext } from "./setup/test-context";
import { fetchCourse } from "../lib/solana/generated/accounts/course";
import { fetchHub } from "../lib/solana/generated/accounts/hub";
import { fetchCourseList } from "../lib/solana/generated/accounts/courseList";
import { getCreateCourseInstructionAsync } from "../lib/solana/generated/instructions/createCourse";
import { getAddAcceptedCourseInstructionAsync } from "../lib/solana/generated/instructions/addAcceptedCourse";
import { getRemoveAcceptedCourseInstructionAsync } from "../lib/solana/generated/instructions/removeAcceptedCourse";
import { getCreateCourseListInstructionAsync } from "../lib/solana/generated/instructions/createCourseList";
import { getAddCourseToListInstructionAsync } from "../lib/solana/generated/instructions/addCourseToList";
import { getRemoveCourseFromListInstructionAsync } from "../lib/solana/generated/instructions/removeCourseFromList";
import {
  sendInstructions,
  getCoursePDA,
  getCourseListPDA,
  generateTestSigner,
  requestAirdrop,
  getProviderPDA,
  LAMPORTS_PER_SOL,
} from "./utils/test-helpers";
import { getInitializeProviderInstructionAsync } from "../lib/solana/generated/instructions/initializeProvider";

import { type Address } from "@solana/kit";

describe("Course Management with Hub Integration", () => {
  let ctx: TestContext;
  let coursePDA: Address;
  let courseCreationTs: bigint;

  before(async () => {
    ctx = await getTestContext();
    courseCreationTs = BigInt(Math.floor(Date.now() / 1000));
    [coursePDA] = await getCoursePDA(
      ctx.hubPDA,
      ctx.providerPDA,
      courseCreationTs,
    );
  });

  it("Should create a course", async () => {
    const instruction = await getCreateCourseInstructionAsync({
      course: coursePDA,
      provider: ctx.providerPDA,
      hub: ctx.hubPDA,
      providerAuthority: ctx.providerWallet,
      creationTimestamp: courseCreationTs,
      name: "Solana Development 101",
      description: "Introduction to Solana blockchain development",
      workloadRequired: 100,
      degreeId: null,
      nostrDTag: null,
      nostrAuthorPubkey: null,
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.providerWallet,
    );
    console.log("Course created:", tx);
    await sleep(1000);

    const courseAccount = await fetchCourse(ctx.rpc, coursePDA);
    expect(courseAccount.data.name).to.equal("Solana Development 101");
    expect(courseAccount.data.provider).to.equal(ctx.providerWallet.address);
  });

  it("Should add accepted course to hub", async () => {
    const instruction = await getAddAcceptedCourseInstructionAsync({
      hub: ctx.hubPDA,
      authority: ctx.hubAuthority,
      course: coursePDA,
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.hubAuthority,
    );
    console.log("Course added to hub:", tx);
    await sleep(1000);

    const hubAccount = await fetchHub(ctx.rpc, ctx.hubPDA);
    expect(hubAccount.data.acceptedCourses).to.have.lengthOf(1);
    expect(hubAccount.data.acceptedCourses[0]).to.equal(coursePDA);
  });

  it("Should fail to add course from non-accepted provider", async () => {
    const newProviderWallet = await generateTestSigner();
    await requestAirdrop(
      ctx.rpcUrl,
      newProviderWallet.address,
      1 * LAMPORTS_PER_SOL,
    );
    await sleep(1000);

    const [newProviderPDA] = await getProviderPDA(
      ctx.hubPDA,
      newProviderWallet.address,
    );
    const initInstruction = await getInitializeProviderInstructionAsync({
      providerAccount: newProviderPDA,
      providerAuthority: newProviderWallet,
      name: "Non-Accepted Provider",
      description: "Test provider",
      website: "https://test.com",
      email: "test@test.com",
      providerType: "education",
    });
    await sendInstructions(ctx.rpcUrl, [initInstruction], newProviderWallet);
    await sleep(1000);

    const newCourseTs = BigInt(Math.floor(Date.now() / 1000));
    const [newCoursePDA] = await getCoursePDA(
      ctx.hubPDA,
      newProviderPDA,
      newCourseTs,
    );

    const createCourseInstruction = await getCreateCourseInstructionAsync({
      course: newCoursePDA,
      provider: newProviderPDA,
      hub: ctx.hubPDA,
      providerAuthority: newProviderWallet,
      creationTimestamp: newCourseTs,
      name: "Test Course",
      description: "Test description",
      workloadRequired: 50,
      degreeId: null,
      nostrDTag: null,
      nostrAuthorPubkey: null,
    });
    await sendInstructions(
      ctx.rpcUrl,
      [createCourseInstruction],
      newProviderWallet,
    );
    await sleep(1000);

    try {
      const addCourseInstruction = await getAddAcceptedCourseInstructionAsync({
        hub: ctx.hubPDA,
        authority: ctx.hubAuthority,
        course: newCoursePDA,
      });
      await sendInstructions(
        ctx.rpcUrl,
        [addCourseInstruction],
        ctx.hubAuthority,
      );
      expect.fail("Should have failed - provider not accepted");
    } catch (error: any) {
      const message = String(error?.context?.logs ?? error);
      expect(message).to.include("ProviderNotAccepted");
    }
  });

  it("Should remove accepted course from hub", async () => {
    const instruction = await getRemoveAcceptedCourseInstructionAsync({
      hub: ctx.hubPDA,
      authority: ctx.hubAuthority,
      course: coursePDA,
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.hubAuthority,
    );
    console.log("Course removed from hub:", tx);
    await sleep(1000);

    const hubAccount = await fetchHub(ctx.rpc, ctx.hubPDA);
    expect(hubAccount.data.acceptedCourses).to.be.an("array").that.is.empty;
  });

  it("Should support course list sharding", async () => {
    const shardTs = BigInt(Math.floor(Date.now() / 1000));
    const [shardedCoursePDA] = await getCoursePDA(
      ctx.hubPDA,
      ctx.providerPDA,
      shardTs,
    );
    const createCourseIx = await getCreateCourseInstructionAsync({
      course: shardedCoursePDA,
      provider: ctx.providerPDA,
      hub: ctx.hubPDA,
      providerAuthority: ctx.providerWallet,
      creationTimestamp: shardTs,
      name: "Sharded Course",
      description: "Stored via CourseList sharding",
      workloadRequired: 25,
      degreeId: null,
      nostrDTag: null,
      nostrAuthorPubkey: null,
    });
    await sendInstructions(ctx.rpcUrl, [createCourseIx], ctx.providerWallet);
    await sleep(1000);

    const courseListIndex = 7;
    const createListIx = await getCreateCourseListInstructionAsync({
      hub: ctx.hubPDA,
      authority: ctx.hubAuthority,
      courseListIndex,
    });
    await sendInstructions(ctx.rpcUrl, [createListIx], ctx.hubAuthority);
    await sleep(1000);

    const addCourseIx = await getAddCourseToListInstructionAsync({
      hub: ctx.hubPDA,
      authority: ctx.hubAuthority,
      course: shardedCoursePDA,
      courseListIndex,
    });
    await sendInstructions(ctx.rpcUrl, [addCourseIx], ctx.hubAuthority);
    await sleep(1000);

    const [courseListPDA] = await getCourseListPDA(ctx.hubPDA, courseListIndex);
    const courseListAccount = await fetchCourseList(ctx.rpc, courseListPDA);
    expect(courseListAccount.data.courses).to.include(shardedCoursePDA);

    const removeFromListIx = await getRemoveCourseFromListInstructionAsync({
      hub: ctx.hubPDA,
      authority: ctx.hubAuthority,
      courseList: courseListPDA,
      course: shardedCoursePDA,
      courseListIndex,
      removeReferenceIfEmpty: true,
    });
    await sendInstructions(ctx.rpcUrl, [removeFromListIx], ctx.hubAuthority);
    await sleep(1000);

    const updatedList = await fetchCourseList(ctx.rpc, courseListPDA);
    expect(updatedList.data.courses).to.have.lengthOf(0);
    const updatedHub = await fetchHub(ctx.rpc, ctx.hubPDA);
    const hasListReference = updatedHub.data.acceptedCourses.some(
      (entry) => String(entry) === String(courseListPDA),
    );
    expect(hasListReference).to.be.false;
  });
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
