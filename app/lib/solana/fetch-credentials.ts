import {
  Connection,
  PublicKey,
  type GetProgramAccountsFilter,
} from "@solana/web3.js";
import {
  getCredentialDiscriminatorBytes,
  decodeCredential,
  Credential,
} from "@/lib/solana/generated/accounts/credential";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "@/lib/solana/pda";
import { Address } from "@solana/kit";
import bs58 from "bs58";

export type EnrolledCredential = {
  publicKey: PublicKey;
  account: Credential & { address: string };
};

export async function fetchCredentialsByStudent(
  connection: Connection,
  studentWallet: PublicKey,
): Promise<EnrolledCredential[]> {
  try {
    // Discriminator is 8 bytes
    // Struct layout from generated code:
    // pub created: i64 (8)
    // pub updated: i64 (8)
    // pub student_wallet: Pubkey (32)
    // Offset = 8 (discriminator) + 8 (created) + 8 (updated) = 24

    const filters: GetProgramAccountsFilter[] = [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(new Uint8Array(getCredentialDiscriminatorBytes())),
        },
      },
      {
        memcmp: {
          offset: 24, // 8 + 8 + 8
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
        const decodedAccount = decodeCredential({
          address: acc.pubkey.toBase58() as Address,
          data: new Uint8Array(acc.account.data),
          // The following fields are ignored by the decoder but keep TS happy.
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
        console.warn(`Failed to decode credential ${acc.pubkey.toBase58()}`, e);
        return null;
      }
    });

    return decoded.filter((item): item is EnrolledCredential => item !== null);
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return [];
  }
}
