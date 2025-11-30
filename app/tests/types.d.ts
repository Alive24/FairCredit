declare module "../target/types/fair_credit" {
  export type FairCredit = any;
}

declare module "@playwright/test" {
  export type Page = any;
  export type BrowserContext = any;
  export const expect: any;
  export const devices: Record<string, Record<string, unknown>>;
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>;
  export interface TestApi {
    (name: string, fn: (...args: any[]) => unknown): unknown;
    describe: (name: string, fn: () => void) => unknown;
    beforeEach: (fn: (...args: any[]) => unknown) => unknown;
    extend: <T extends Record<string, unknown>>(fixtures: T) => TestApi;
  }
  export const test: TestApi;
}

declare module "dotenv" {
  const dotenv: {
    config: (options?: Record<string, unknown>) => void;
  };
  export default dotenv;
}
