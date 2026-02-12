import { describe, expect, it } from "vitest";

describe("sample integration test", () => {
  it("reads an environment flag", () => {
    expect(process.env.NODE_ENV ?? "test").toBeDefined();
  });
});
