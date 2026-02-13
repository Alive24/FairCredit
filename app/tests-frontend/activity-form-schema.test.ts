import { expect } from "chai";
import {
  activityCreateSchemaByKind,
  parseCsvIdList,
} from "../lib/activities/activity-form-schema";

describe("activity form schema", () => {
  it("validates submit assignment shape", () => {
    const result = activityCreateSchemaByKind.SubmitAssignment.safeParse({
      kind: "SubmitAssignment",
      moduleId: "module-1",
      title: "Week 1 Assignment",
      description: "Completed all required tasks and submitted evidence.",
      resourceId: "resource-1",
      resourceKind: "Assignment",
      evidenceLinks: ["https://example.com/evidence"],
    });

    expect(result.success).to.equal(true);
  });

  it("rejects invalid consume resource progress", () => {
    const result = activityCreateSchemaByKind.ConsumeResource.safeParse({
      kind: "ConsumeResource",
      moduleId: "module-1",
      title: "Watched lecture",
      description: "Reviewed the lecture and summary material.",
      resourceId: "res-1",
      resourceKind: "General",
      progress: 120,
      reflection: "Useful.",
    });

    expect(result.success).to.equal(false);
  });

  it("validates add feedback shape", () => {
    const result = activityCreateSchemaByKind.AddFeedback.safeParse({
      kind: "AddFeedback",
      moduleId: "module-1",
      content: "Great mentoring session.",
      assetIds: ["asset1"],
      evidenceAssetIds: ["evidence1"],
    });

    expect(result.success).to.equal(true);
  });

  it("parses CSV ids into unique list", () => {
    const parsed = parseCsvIdList("asset1, asset2,asset1,  ,asset3");
    expect(parsed).to.deep.equal(["asset1", "asset2", "asset3"]);
  });
});
