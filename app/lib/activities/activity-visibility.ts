const VISIBILITY_TAG_PREFIX = "fc_visibility:";
export const HIDDEN_FROM_SUPERVISOR_TAG =
  `${VISIBILITY_TAG_PREFIX}hidden_from_supervisor`;

function parseRawObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractActivityTags(raw: string): string[] {
  const obj = parseRawObject(raw);
  if (!obj) return [];
  if (!Array.isArray(obj.tags)) return [];

  const tags = obj.tags
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(tags));
}

export function isHiddenFromSupervisor(raw: string): boolean {
  return extractActivityTags(raw).includes(HIDDEN_FROM_SUPERVISOR_TAG);
}

export function toggleHiddenFromSupervisorTag(params: {
  raw: string;
  hidden: boolean;
}): string | null {
  const obj = parseRawObject(params.raw);
  if (!obj) return null;

  const tags = extractActivityTags(params.raw);
  const preserved = tags.filter((entry) => entry !== HIDDEN_FROM_SUPERVISOR_TAG);
  const nextTags = params.hidden
    ? [...preserved, HIDDEN_FROM_SUPERVISOR_TAG]
    : preserved;

  return JSON.stringify({
    ...obj,
    tags: Array.from(new Set(nextTags)),
  });
}
