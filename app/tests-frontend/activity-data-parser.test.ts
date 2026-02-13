import { expect } from "chai";
import { parseActivityData } from "../lib/types/activity-data";

describe("activity data parser", () => {
  it("parses new SubmitAssignment payload", () => {
    const raw = JSON.stringify({
      kind: "SubmitAssignment",
      title: "Assignment A",
      description: "Completed assignment A",
      evidenceLinks: ["https://example.com/a"],
      modules: [{ module_pubkey: "module-1" }],
    });

    const parsed = parseActivityData(raw);

    expect(parsed.kind).to.equal("SubmitAssignment");
    expect(parsed.title).to.equal("Assignment A");
    expect(parsed.modules.length).to.equal(1);
  });

  it("rejects legacy payload format", () => {
    const raw = JSON.stringify({
      title: "Legacy entry",
      description: "Legacy description",
      evidenceLink: "https://example.com/legacy",
      modules: [{ moduleId: "module-legacy" }],
    });

    const parsed = parseActivityData(raw);

    expect(parsed.parsed).to.equal(null);
    expect(parsed.kind).to.equal(null);
    expect(parsed.title).to.equal("Invalid Activity Data");
    expect(parsed.evidenceLinks).to.deep.equal([]);
    expect(parsed.modules.length).to.equal(0);
  });

  it("rejects non-JSON payload", () => {
    const parsed = parseActivityData("plain text payload");

    expect(parsed.parsed).to.equal(null);
    expect(parsed.title).to.equal("Invalid Activity Data");
    expect(parsed.description).to.equal("Unsupported activity payload format.");
  });
});
