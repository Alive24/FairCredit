import { expect } from "chai";
import {
  canPerformActivityAction,
  getCreateActivityKindsForRole,
} from "../lib/activities/activity-policy";

describe("activity policy", () => {
  it("allows student create/feedback/attendance/archive and blocks grade", () => {
    expect(canPerformActivityAction("student", "create")).to.equal(true);
    expect(canPerformActivityAction("student", "add_feedback")).to.equal(true);
    expect(canPerformActivityAction("student", "add_attendance")).to.equal(true);
    expect(canPerformActivityAction("student", "add_grade")).to.equal(false);
    expect(canPerformActivityAction("student", "archive")).to.equal(true);
  });

  it("allows supervisor grade and blocks archive/student actions", () => {
    expect(canPerformActivityAction("supervisor", "add_grade")).to.equal(true);
    expect(canPerformActivityAction("supervisor", "archive")).to.equal(false);
    expect(canPerformActivityAction("supervisor", "create")).to.equal(false);
    expect(canPerformActivityAction("supervisor", "add_feedback")).to.equal(false);
    expect(canPerformActivityAction("supervisor", "add_attendance")).to.equal(false);
  });

  it("returns expected create kind set per role", () => {
    expect(getCreateActivityKindsForRole("student")).to.deep.equal([
      "SubmitAssignment",
      "AttendMeeting",
      "AddFeedback",
    ]);

    expect(getCreateActivityKindsForRole("supervisor")).to.deep.equal([]);

    expect(
      getCreateActivityKindsForRole("supervisor", {
        existingActivityContext: true,
      }),
    ).to.deep.equal(["AddGrade"]);
  });
});
