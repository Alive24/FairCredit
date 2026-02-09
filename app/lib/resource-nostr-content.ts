/**
 * Resource Nostr Event Content Schema
 *
 * This defines the JSON structure stored in Nostr events for Resource content.
 * Resources use Nostr for mutable, decentralized content storage.
 */

export type ResourceNostrContent = {
  /** Type identifier for this schema */
  type: "faircredit-resource";

  /** Resource address on Solana */
  resourceAddress: string;

  /** Creation timestamp (Unix timestamp in seconds) */
  created: number;

  /** Last update timestamp (Unix timestamp in milliseconds) */
  updatedAt: number;

  /** Rich content for the resource (Markdown/HTML) */
  content: string;

  /** Optional metadata */
  metadata?: {
    /** Resource kind (Assignment, Meeting, Publication, etc.) */
    kind?: string;

    /** Resource name */
    name?: string;

    /** External identifier for integration */
    externalId?: string | null;

    /** Workload in minutes */
    workload?: number | null;

    /** Tags for categorization */
    tags?: string[];

    /** Course address this resource belongs to */
    course?: string;

    /** Resource status */
    status?: string;

    /** Additional custom fields */
    [key: string]: unknown;
  };
};

/**
 * Type guard to validate ResourceNostrContent structure
 */
export function isResourceNostrContent(
  value: unknown,
): value is ResourceNostrContent {
  if (!value || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;

  return (
    obj.type === "faircredit-resource" &&
    typeof obj.resourceAddress === "string" &&
    typeof obj.created === "number" &&
    typeof obj.updatedAt === "number" &&
    typeof obj.content === "string"
  );
}

/**
 * Build a Resource Nostr content payload
 */
export function buildResourceNostrContent(params: {
  resourceAddress: string;
  created: number;
  content: string;
  metadata?: ResourceNostrContent["metadata"];
}): ResourceNostrContent {
  return {
    type: "faircredit-resource",
    resourceAddress: params.resourceAddress,
    created: params.created,
    updatedAt: Date.now(),
    content: params.content,
    metadata: params.metadata,
  };
}

/**
 * Parse a Resource Nostr content payload from JSON string
 */
export function parseResourceNostrContent(
  json: string,
): ResourceNostrContent | null {
  try {
    const parsed = JSON.parse(json);
    return isResourceNostrContent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
