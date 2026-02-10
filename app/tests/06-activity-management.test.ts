import { expect } from "chai";
import { getTestContext, type TestContext } from "./setup/test-context";
import { fetchActivity } from "../lib/solana/generated/accounts/activity";
import { getCreateActivityInstructionAsync } from "../lib/solana/generated/instructions/createActivity";
import { getAddFeedbackInstruction } from "../lib/solana/generated/instructions/addFeedback";
import { getAddGradeInstruction } from "../lib/solana/generated/instructions/addGrade";
import { getAddAttendanceInstruction } from "../lib/solana/generated/instructions/addAttendance";
import { getArchiveActivityInstruction } from "../lib/solana/generated/instructions/archiveActivity";
import { ActivityKind } from "../lib/solana/generated/types/activityKind";
import { ActivityStatus } from "../lib/solana/generated/types/activityStatus";
import { sendInstructions, getCoursePDA } from "./utils/test-helpers";
import { getCreateCourseInstructionAsync } from "../lib/solana/generated/instructions/createCourse";

import {
  type Address,
  getProgramDerivedAddress,
  getBytesEncoder,
  getAddressEncoder,
} from "@solana/kit";

describe("Activity Management", () => {
  let ctx: TestContext;
  let coursePDA: Address;
  let activityPDA: Address;

  before(async () => {
    ctx = await getTestContext();

    // Create a course to link activities to
    const courseTs = BigInt(Math.floor(Date.now() / 1000));
    [coursePDA] = await getCoursePDA(ctx.hubPDA, ctx.providerPDA, courseTs);

    const createCourseIx = await getCreateCourseInstructionAsync({
      course: coursePDA,
      provider: ctx.providerPDA,
      hub: ctx.hubPDA,
      providerAuthority: ctx.providerWallet,
      creationTimestamp: courseTs,
      name: "Activity Test Course",
      description: "Course for testing activities",
      workloadRequired: 10,
      degreeId: null,
      nostrDTag: null,
      nostrAuthorPubkey: null,
    });

    await sendInstructions(ctx.rpcUrl, [createCourseIx], ctx.providerWallet);
    await sleep(1000);
  });

  it("Should create an activity", async () => {
    const creationTimestamp = BigInt(Math.floor(Date.now() / 1000));

    const instruction = await getCreateActivityInstructionAsync({
      activity: undefined, // PDA will be derived or returned
      student: ctx.studentWallet,
      provider: ctx.providerPDA,
      hub: ctx.hubPDA,
      creationTimestamp,
      kind: ActivityKind.AttendMeeting,
      data: "Attended weekly sync",
      degreeId: null,
      course: coursePDA,
      resourceId: null,
      resourceKind: null,
    });

    // Check if the instruction returns the PDA address (Codama usually does for init)
    // If not, we might need to derive it manually, but let's assume standard pattern
    activityPDA = instruction.accounts[0].address;

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.studentWallet,
    );
    console.log("Activity created:", tx);
    await sleep(1000);

    const activityAccount = await fetchActivity(ctx.rpc, activityPDA);
    expect(activityAccount.data.kind).to.deep.equal(ActivityKind.AttendMeeting);
    expect(activityAccount.data.data).to.equal("Attended weekly sync");
    expect(activityAccount.data.status).to.deep.equal(ActivityStatus.Active);
  });

  it("Should add attendance to activity", async () => {
    const timestamp = new Date().toISOString();
    const instruction = await getAddAttendanceInstruction({
      activity: activityPDA,
      studentAuthority: ctx.studentWallet,
      timestamp: timestamp,
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.studentWallet,
    );
    console.log("Attendance added:", tx);
    await sleep(1000);

    const activityAccount = await fetchActivity(ctx.rpc, activityPDA);
    expect(activityAccount.data.data).to.equal(timestamp);
  });

  it("Should add feedback to activity", async () => {
    const instruction = await getAddFeedbackInstruction({
      activity: activityPDA,
      studentAuthority: ctx.studentWallet,
      content: "Great session!",
      assetIds: ["asset1", "asset2"],
      evidenceAssetIds: ["evidence1"],
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.studentWallet,
    );
    console.log("Feedback added:", tx);
    await sleep(1000);

    const activityAccount = await fetchActivity(ctx.rpc, activityPDA);
    expect(activityAccount.data.data).to.equal("Great session!");
    expect(activityAccount.data.assets).to.include("asset1");
  });

  it("Should add grade to activity (by teacher/provider)", async () => {
    // Ideally this should be a teacher, but we'll use provider wallet if the contract allows
    // The contract check is likely just a signer, need to check constraints
    // For now assuming providerAuthority can act as teacher or we'd need a separate role

    // Note: The contract logic for AddGrade expects a 'teacher' signer.
    // In a real app this might be restricted, but let's try with providerWallet

    const instruction = await getAddGradeInstruction({
      activity: activityPDA,
      teacher: ctx.providerWallet, // Using provider as teacher
      gradeValue: 95.5,
      assetIds: [],
      evidenceAssetIds: [],
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.providerWallet,
    );
    console.log("Grade added:", tx);
    await sleep(1000);

    const activityAccount = await fetchActivity(ctx.rpc, activityPDA);
    expect(activityAccount.data.grade).to.equal(95.5);
  });

  it("Should archive activity", async () => {
    const instruction = await getArchiveActivityInstruction({
      activity: activityPDA,
      user: ctx.studentWallet,
    });

    const tx = await sendInstructions(
      ctx.rpcUrl,
      [instruction],
      ctx.studentWallet,
    );
    console.log("Activity archived:", tx);
    await sleep(1000);

    const activityAccount = await fetchActivity(ctx.rpc, activityPDA);
    expect(activityAccount.data.status).to.deep.equal(ActivityStatus.Archived);
  });
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
