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

    /** Module-specific rich content fields */
    module?: ResourceModuleRichData;
  };
};

export type ResourceModuleRichData = {
  guidance: string;
  materials: string[];
  materialsContent?: string;
  defaultActivities?: ModuleDefaultActivityTemplate[];
};

export type ModuleDefaultActivityTemplateKind =
  | "AttendMeeting"
  | "AddFeedback"
  | "SubmitAssignment";

export type ModuleDefaultActivityTemplate = {
  kind: ModuleDefaultActivityTemplateKind;
  title: string;
  description: string;
  requiredAttendance?: number;
  requiredEvidenceCount?: number;
  requiredFeedbackEntries?: number;
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

function normalizeMaterialList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function stripHtml(input: string): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function richTextToPlain(input: string): string {
  return stripHtml(input);
}

function extractMaterialListFromRich(input: string): string[] {
  const plain = stripHtml(input);
  if (!plain) return [];
  const unique = new Set<string>();
  plain.split(/[\n,]/).forEach((entry) => {
    const normalized = entry.trim();
    if (normalized) unique.add(normalized);
  });
  return Array.from(unique).slice(0, 40);
}

const MODULE_DEFAULT_KIND_SET = new Set<ModuleDefaultActivityTemplateKind>([
  "AttendMeeting",
  "AddFeedback",
  "SubmitAssignment",
]);

function normalizePositiveInt(input: unknown): number | undefined {
  if (typeof input !== "number" || !Number.isFinite(input)) return undefined;
  const rounded = Math.floor(input);
  if (rounded <= 0) return undefined;
  return rounded;
}

function normalizeDefaultActivities(
  input: unknown,
): ModuleDefaultActivityTemplate[] {
  if (!Array.isArray(input)) return [];

  const normalized = input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Record<string, unknown>;
      const kind = raw.kind;
      if (
        typeof kind !== "string" ||
        !MODULE_DEFAULT_KIND_SET.has(kind as ModuleDefaultActivityTemplateKind)
      ) {
        return null;
      }

      const title =
        typeof raw.title === "string" && raw.title.trim()
          ? raw.title.trim()
          : `${kind} Tracker`;
      const description =
        typeof raw.description === "string" ? raw.description.trim() : "";

      const next: ModuleDefaultActivityTemplate = {
        kind: kind as ModuleDefaultActivityTemplateKind,
        title,
        description,
      };

      const requiredAttendance = normalizePositiveInt(raw.requiredAttendance);
      if (typeof requiredAttendance === "number") {
        next.requiredAttendance = requiredAttendance;
      }

      const requiredEvidenceCount = normalizePositiveInt(
        raw.requiredEvidenceCount,
      );
      if (typeof requiredEvidenceCount === "number") {
        next.requiredEvidenceCount = requiredEvidenceCount;
      }

      const requiredFeedbackEntries = normalizePositiveInt(
        raw.requiredFeedbackEntries,
      );
      if (typeof requiredFeedbackEntries === "number") {
        next.requiredFeedbackEntries = requiredFeedbackEntries;
      }

      return next;
    })
    .filter((entry): entry is ModuleDefaultActivityTemplate => entry !== null);

  const dedupByKind = new Map<ModuleDefaultActivityTemplateKind, ModuleDefaultActivityTemplate>();
  normalized.forEach((entry) => dedupByKind.set(entry.kind, entry));
  return Array.from(dedupByKind.values());
}

export function parseModuleRichData(
  json: string,
): {
  content: string;
  guidance: string;
  materials: string[];
  materialsRich: string;
  defaultActivities: ModuleDefaultActivityTemplate[];
} {
  const parsed = parseResourceNostrContent(json);
  if (!parsed) {
    return {
      content: json,
      guidance: json.trim(),
      materials: [],
      materialsRich: "",
      defaultActivities: [],
    };
  }

  const metadata = parsed.metadata ?? {};
  const moduleRaw = metadata.module;
  const moduleData =
    moduleRaw && typeof moduleRaw === "object"
      ? (moduleRaw as Record<string, unknown>)
      : null;
  const guidance =
    moduleData && typeof moduleData.guidance === "string"
      ? moduleData.guidance.trim()
      : "";
  const materialsRich =
    moduleData && typeof moduleData.materialsContent === "string"
      ? moduleData.materialsContent.trim()
      : moduleData && typeof moduleData.materials === "string"
        ? moduleData.materials.trim()
        : "";
  const materials = moduleData
    ? materialsRich
      ? extractMaterialListFromRich(materialsRich)
      : normalizeMaterialList(moduleData.materials)
    : [];
  const defaultActivities = moduleData
    ? normalizeDefaultActivities(moduleData.defaultActivities)
    : [];

  return {
    content: parsed.content,
    guidance: guidance || parsed.content.trim(),
    materials,
    materialsRich,
    defaultActivities,
  };
}

export function serializeModuleRichData(params: {
  resourceAddress: string;
  created: number;
  content: string;
  guidance: string;
  materials: string[];
  materialsRich?: string;
  defaultActivities?: ModuleDefaultActivityTemplate[];
  metadata?: ResourceNostrContent["metadata"];
}): string {
  const normalizedMaterials = params.materialsRich
    ? extractMaterialListFromRich(params.materialsRich)
    : normalizeMaterialList(params.materials);

  const nextMetadata: ResourceNostrContent["metadata"] = {
    ...(params.metadata ?? {}),
    module: {
      guidance: params.guidance.trim(),
      materials: normalizedMaterials,
      materialsContent: params.materialsRich?.trim() || "",
      defaultActivities: normalizeDefaultActivities(params.defaultActivities),
    },
  };

  const payload = buildResourceNostrContent({
    resourceAddress: params.resourceAddress,
    created: params.created,
    content: params.content,
    metadata: nextMetadata,
  });

  return JSON.stringify(payload);
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
