import { address, type Address } from "@solana/kit";

/** Normalize wallet/authority to canonical base58 string for comparison. */
export function canonicalAddress(
  v: string | Address | { address?: string } | null | undefined,
): string | null {
  if (v == null) return null;
  const raw =
    typeof v === "object" &&
    "address" in v &&
    typeof (v as { address?: string }).address === "string"
      ? (v as { address: string }).address
      : typeof v === "string"
      ? v
      : String(v);
  if (!raw || !raw.trim()) return null;
  try {
    return String(address(raw));
  } catch {
    return null;
  }
}
