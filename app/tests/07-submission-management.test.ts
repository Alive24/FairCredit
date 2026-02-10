import { expect } from "chai";
import { getTestContext, type TestContext } from "./setup/test-context";
import { fetchSubmission } from "../lib/solana/generated/accounts/submission";
import { getCreateSubmissionInstructionAsync } from "../lib/solana/generated/instructions/createSubmission";
import { getGradeSubmissionInstruction } from "../lib/solana/generated/instructions/gradeSubmission";
import { getSetSubmissionNostrRefInstruction } from "../lib/solana/generated/instructions/setSubmissionNostrRef";
import { getSetSubmissionWalrusRefInstruction } from "../lib/solana/generated/instructions/setSubmissionWalrusRef";
import { SubmissionStatus } from "../lib/solana/generated/types/submissionStatus";
import { ResourceKind } from "../lib/solana/generated/types/resourceKind";
import { sendInstructions, getCoursePDA } from "./utils/test-helpers";
import { getCreateCourseInstructionAsync } from "../lib/solana/generated/instructions/createCourse";
import { getAddResourceInstructionAsync } from "../lib/solana/generated/instructions/addResource";
import { type Address } from "@solana/kit";

describe("Submission Management", () => {
  let ctx: TestContext;
  let coursePDA: Address;
  let resourcePDA: Address;
  let submissionPDA: Address;

  before(async () => {
    ctx = await getTestContext();

    // Setup: Course + Resource
    const courseTs = BigInt(Math.floor(Date.now() / 1000));
    [coursePDA] = await getCoursePDA(ctx.hubPDA, ctx.providerPDA, courseTs);

    const createCourseIx = await getCreateCourseInstructionAsync({
      course: coursePDA,
      provider: ctx.providerPDA,
      hub: ctx.hubPDA,
      providerAuthority: ctx.providerWallet,
      creationTimestamp: courseTs,
      name: "Submission Test Course",
      description: "Course for testing submissions",
      workloadRequired: 10,
      degreeId: null,
      nostrDTag: null,
      nostrAuthorPubkey: null,
    });
    await sendInstructions(ctx.rpcUrl, [createCourseIx], ctx.providerWallet);
    await sleep(1000);

    const addResourceIx = await getAddResourceInstructionAsync({
      resource: undefined,
      course: coursePDA,
      provider: ctx.providerPDA,
      hub: ctx.hubPDA,
      providerAuthority: ctx.providerWallet,
      creationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
      kind: ResourceKind.Assignment,
      name: "Final Project",
      externalId: null,
      workload: 5,
      tags: ["project"],
      nostrDTag: null,
      nostrAuthorPubkey: null,
    });
    resourcePDA = addResourceIx.accounts[0].address;
    await sendInstructions(ctx.rpcUrl, [addResourceIx], ctx.providerWallet);
    await sleep(1000);
  });

  it("Should create a submission", async () => {
    const submissionTs = BigInt(Math.floor(Date.now() / 1000));

    const instruction = await getCreateSubmissionInstructionAsync({
      submission: undefined,
      resource: resourcePDA,
      student: ctx.studentWallet,
      submissionTimestamp: submissionTs,
      assets: [],
      evidenceAssets: [],
    });
    submissionPDA = instruction.accounts[0].address;

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.studentWallet,
    );
    console.log("Submission created:", tx);
    await sleep(1000);

    const submissionAccount = await fetchSubmission(ctx.rpc, submissionPDA);
    expect(submissionAccount.data.status).to.deep.equal(
      SubmissionStatus.Submitted,
    );
    expect(submissionAccount.data.student).to.equal(ctx.studentWallet.address);
  });

  it("Should set Nostr reference for submission", async () => {
    const instruction = await getSetSubmissionNostrRefInstruction({
      submission: submissionPDA,
      authority: ctx.studentWallet, // Only student can update their submission refs
      nostrDTag: "my-submission-v1",
      nostrAuthorPubkey: new Uint8Array(32).fill(1),
      force: false,
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.studentWallet,
    );
    console.log("Nostr ref set:", tx);
    await sleep(1000);

    const submissionAccount = await fetchSubmission(ctx.rpc, submissionPDA);
    expect(submissionAccount.data.nostrDTag.__option).to.equal("Some");
    expect((submissionAccount.data.nostrDTag as any).value).to.equal(
      "my-submission-v1",
    );
  });

  it("Should set Walrus reference for submission", async () => {
    const instruction = await getSetSubmissionWalrusRefInstruction({
      submission: submissionPDA,
      authority: ctx.studentWallet,
      walrusBlobId: "blob-xyz-123",
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.studentWallet,
    );
    console.log("Walrus ref set:", tx);
    await sleep(1000);

    const submissionAccount = await fetchSubmission(ctx.rpc, submissionPDA);
    expect(submissionAccount.data.walrusBlobId.__option).to.equal("Some");
    expect((submissionAccount.data.walrusBlobId as any).value).to.equal(
      "blob-xyz-123",
    );
  });

  it("Should grade a submission", async () => {
    const instruction = await getGradeSubmissionInstruction({
      submission: submissionPDA,
      grader: ctx.mentorWallet, // Any signer can grade in current contract logic? Need to verify constraint
      grade: 88.0,
      feedback: "Great work on the project!",
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.mentorWallet,
    );
    console.log("Submission graded:", tx);
    await sleep(1000);

    const submissionAccount = await fetchSubmission(ctx.rpc, submissionPDA);
    expect(submissionAccount.data.status).to.deep.equal(
      SubmissionStatus.Graded,
    );
    expect(submissionAccount.data.grade).to.equal(88.0);
    expect(submissionAccount.data.feedback.__option).to.equal("Some");
  });
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
