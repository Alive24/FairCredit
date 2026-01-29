import { getProgramDerivedAddress, address } from "@solana/kit";
import {
  getBytesEncoder,
  getAddressEncoder,
  getUtf8Encoder,
} from "@solana/kit";
import type { Address } from "@solana/kit";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "../../app/lib/solana/generated/programs";

export async function getHubPDA(): Promise<[Address, number]> {
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [getBytesEncoder().encode(new Uint8Array([104, 117, 98]))],
  });
  return [pda[0], pda[1]];
}

export async function getProviderPDA(
  providerWallet: string,
): Promise<[Address, number]> {
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([112, 114, 111, 118, 105, 100, 101, 114]),
      ),
      getAddressEncoder().encode(address(providerWallet)),
    ],
  });
  return [pda[0], pda[1]];
}

export async function getCoursePDA(
  courseId: string,
): Promise<[Address, number]> {
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([99, 111, 117, 114, 115, 101])),
      getUtf8Encoder().encode(courseId),
    ],
  });
  return [pda[0], pda[1]];
}
