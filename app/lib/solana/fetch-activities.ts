import {
  Connection,
  PublicKey,
  type GetProgramAccountsFilter,
} from "@solana/web3.js";
import {
  getActivityDiscriminatorBytes,
  decodeActivity,
  Activity,
} from "@/lib/solana/generated/accounts/activity";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "@/lib/solana/pda";
import { Address } from "@solana/kit";
import bs58 from "bs58";

export type EnrolledActivity = {
  publicKey: PublicKey;
  account: Activity & { address: string };
};

export async function fetchActivitiesByStudentAndCourse(
  connection: Connection,
  studentWallet: PublicKey,
  courseAddress: PublicKey,
): Promise<EnrolledActivity[]> {
  try {
    // Activity struct:
    // pub created: i64
    // pub updated: i64
    // pub student: Pubkey
    // pub provider: Pubkey
    // Offset of `student`: 8 (discriminator) + 8 (created) + 8 (updated) = 24.

    // We also want to filter by course if possible, but course is variable offset.
    // So filter by student first (indexed/fixed offset), then filter in memory.

    const filters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(new Uint8Array(getActivityDiscriminatorBytes())),
        },
      },
      {
        memcmp: {
          offset: 24,
          bytes: studentWallet.toBase58(),
        },
      },
    ];

    const accounts = await connection.getProgramAccounts(
      new PublicKey(FAIR_CREDIT_PROGRAM_ADDRESS),
      {
        filters,
      },
    );

    const decoded = accounts.map((acc) => {
      try {
        // Adapt web3.js getProgramAccounts result into Codama's encoded account shape.
        const decodedAccount = decodeActivity({
          address: acc.pubkey.toBase58() as Address,
          data: new Uint8Array(acc.account.data),
          executable: acc.account.executable,
          lamports: BigInt(acc.account.lamports),
          programAddress: acc.account.owner.toBase58() as Address,
          space: BigInt(acc.account.data.length),
        } as any);
        return {
          publicKey: acc.pubkey,
          account: {
            ...decodedAccount.data,
            address: acc.pubkey.toBase58(),
          },
        };
      } catch (e) {
        console.warn(`Failed to decode activity ${acc.pubkey.toBase58()}`, e);
        return null;
      }
    });

    // Filter by course in memory
    // courseAddress is PublicKey, account.course is Option<Address>.
    // Option in generated code is usually { __option: "Some", value: Address } or similar.
    // But type definition shows `course: Option<Address>`.
    // Let's check `Activity` type definition in `activity.ts`.
    // It says `course: Option<Address>`.
    // The decoded `Option` usually has `__option`.

    return decoded
      .filter((item): item is EnrolledActivity => item !== null)
      .filter((item) => {
        const courseOpt = item.account.course as any;
        if (courseOpt?.__option === "Some") {
          return courseOpt.value === courseAddress.toBase58();
        }
        // Or if it's simpler type (unlikely for Option in Codama)
        return courseOpt === courseAddress.toBase58();
      });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
}
