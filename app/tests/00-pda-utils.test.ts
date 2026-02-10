import { expect } from "chai";
import { getCredentialPDA } from "./utils/test-helpers";
import { getTestContext, type TestContext } from "./setup/test-context";

describe("PDA Utilities", () => {
  let ctx: TestContext;

  before(async () => {
    ctx = await getTestContext();
  });

  it("should derive credential PDAs consistently", async () => {
    const dummyCourse = ctx.hubPDA;
    const student = ctx.studentWallet.address;
    const [pda1] = await getCredentialPDA(dummyCourse, student);
    const [pda2] = await getCredentialPDA(dummyCourse, student);
    expect(pda1).to.equal(pda2);
  });
});
