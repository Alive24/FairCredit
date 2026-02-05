"use client";

import type { Address } from "@solana/kit";
import { finalizeEvent } from "nostr-tools";

export type NostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

export type PublishResult = {
  eventId: string;
  authorPubkey: string;
};

export type RelayConfig = {
  url: string;
};

// Default relay set; can be extended via configuration or env vars.
export const DEFAULT_RELAYS: RelayConfig[] = [
  { url: "wss://relay.damus.io" },
  { url: "wss://relay.snort.social" },
];

// Application-specific kinds used to filter events.
const RESOURCE_EVENT_KIND = 30000;
const COURSE_EVENT_KIND = 30001;

type WebSocketLike = WebSocket;
type SignMessageFn = (message: Uint8Array) => Promise<Uint8Array> | Uint8Array;

const NOSTR_SEED_MESSAGE = "FairCredit Nostr seed v1";
const cachedSecrets = new Map<string, Uint8Array>();
const COURSE_EVENT_CACHE_PREFIX = "faircredit.course-event-by-dtag:";

async function openRelay(url: string): Promise<WebSocketLike> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Relay ${url} connection timeout`));
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      resolve(ws);
    };
    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Relay ${url} connection error`));
    };
  });
}

type NostrEventTemplate = Pick<
  NostrEvent,
  "kind" | "tags" | "content" | "created_at"
>;

async function sha256Bytes(input: Uint8Array): Promise<Uint8Array> {
  const normalized = new Uint8Array(input);
  const digest = await crypto.subtle.digest("SHA-256", normalized);
  return new Uint8Array(digest);
}

function normalizeSignatureBytes(sig: Uint8Array | ArrayBuffer | number[]) {
  if (sig instanceof Uint8Array) return sig;
  if (sig instanceof ArrayBuffer) return new Uint8Array(sig);
  return new Uint8Array(sig);
}

async function deriveSecretKeyFromSignature(params: {
  walletAddress: string;
  signMessage: SignMessageFn;
}): Promise<Uint8Array> {
  const normalized = params.walletAddress.trim();
  const message = new TextEncoder().encode(
    `${NOSTR_SEED_MESSAGE}:${normalized}`,
  );
  const signature = await params.signMessage(message);
  let seed = await sha256Bytes(normalizeSignatureBytes(signature));
  if (seed.every((b) => b === 0)) {
    seed = await sha256Bytes(seed);
  }
  return seed;
}

async function getCachedOrDerivedSecretKey(params: {
  walletAddress: string;
  signMessage?: SignMessageFn;
}): Promise<Uint8Array> {
  const normalized = params.walletAddress.trim();
  const cached = cachedSecrets.get(normalized);
  if (cached) return cached;
  if (!params.signMessage) {
    throw new Error("Wallet does not support message signing");
  }
  const seed = await deriveSecretKeyFromSignature({
    walletAddress: normalized,
    signMessage: params.signMessage,
  });
  cachedSecrets.set(normalized, seed);
  return seed;
}

async function signEventWithWalletSeed(
  draft: NostrEventTemplate,
  walletAddress: string,
  signMessage?: SignMessageFn,
): Promise<NostrEvent> {
  if (!walletAddress) {
    throw new Error("Wallet address required for deterministic Nostr signing");
  }
  const secretKey = await getCachedOrDerivedSecretKey({
    walletAddress,
    signMessage,
  });
  try {
    return finalizeEvent(draft, secretKey) as unknown as NostrEvent;
  } catch {
    const fallbackKey = await sha256Bytes(secretKey);
    return finalizeEvent(draft, fallbackKey) as unknown as NostrEvent;
  }
}

function getCourseEventCacheKey(dTag: string) {
  return `${COURSE_EVENT_CACHE_PREFIX}${dTag}`;
}

export function loadCachedCourseEventByDTag(dTag: string): NostrEvent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getCourseEventCacheKey(dTag));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NostrEvent;
    if (!parsed || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCourseEventByDTag(dTag: string, event: NostrEvent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getCourseEventCacheKey(dTag),
      JSON.stringify(event),
    );
  } catch {
    // ignore storage errors
  }
}

export async function publishResourceEvent(params: {
  relays?: RelayConfig[];
  dTag: string;
  content: string;
  walletAddress: string;
  signMessage?: SignMessageFn;
}): Promise<PublishResult> {
  const relays = params.relays ?? DEFAULT_RELAYS;
  const createdAt = Math.floor(Date.now() / 1000);

  const draft: NostrEventTemplate = {
    kind: RESOURCE_EVENT_KIND,
    created_at: createdAt,
    tags: [
      ["d", params.dTag],
      ["t", "faircredit-resource"],
    ],
    content: params.content,
  };

  const event = await signEventWithWalletSeed(
    draft,
    params.walletAddress,
    params.signMessage,
  );

  const payload = ["EVENT", event] as const;
  const json = JSON.stringify(payload);

  await Promise.allSettled(
    relays.map(async ({ url }) => {
      try {
        const ws = await openRelay(url);
        ws.send(json);
        // Simple fire-and-forget; can be extended to wait for OK later.
        setTimeout(() => ws.close(), 2000);
      } catch {
        // Ignore individual relay failure; higher-level retry logic can handle it.
      }
    }),
  );

  return {
    eventId: event.id,
    authorPubkey: event.pubkey,
  };
}

export async function publishCourseEvent(params: {
  relays?: RelayConfig[];
  dTag: string;
  content: string;
  walletAddress: string;
  signMessage?: SignMessageFn;
}): Promise<PublishResult> {
  const relays = params.relays ?? DEFAULT_RELAYS;
  const createdAt = Math.floor(Date.now() / 1000);

  const draft: NostrEventTemplate = {
    kind: COURSE_EVENT_KIND,
    created_at: createdAt,
    tags: [
      ["d", params.dTag],
      ["t", "faircredit-course"],
    ],
    content: params.content,
  };

  const event = await signEventWithWalletSeed(
    draft,
    params.walletAddress,
    params.signMessage,
  );

  const payload = ["EVENT", event] as const;
  const json = JSON.stringify(payload);

  await Promise.allSettled(
    relays.map(async ({ url }) => {
      try {
        const ws = await openRelay(url);
        ws.send(json);
        setTimeout(() => ws.close(), 2000);
      } catch {
        // ignore relay failure
      }
    }),
  );

  return {
    eventId: event.id,
    authorPubkey: event.pubkey,
  };
}

export async function fetchLatestResourceEvent(params: {
  relays?: RelayConfig[];
  dTag: string;
  authorPubkey: string;
}): Promise<NostrEvent | null> {
  const relays = params.relays ?? DEFAULT_RELAYS;
  const filters = [
    {
      kinds: [RESOURCE_EVENT_KIND],
      authors: [params.authorPubkey],
      "#d": [params.dTag],
      limit: 1,
    },
  ];

  const subPayload = ["REQ", "faircredit-resource-sub", ...filters] as const;
  const json = JSON.stringify(subPayload);

  let latest: NostrEvent | null = null;

  await Promise.allSettled(
    relays.map(async ({ url }) => {
      try {
        const ws = await openRelay(url);
        ws.send(json);

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve();
          }, 4000);

          ws.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data as string);
              if (Array.isArray(msg) && msg[0] === "EVENT") {
                const event = msg[2] as NostrEvent;
                if (!latest || event.created_at > latest.created_at) {
                  latest = event;
                }
              }
              if (Array.isArray(msg) && msg[0] === "EOSE") {
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            } catch {
              // ignore parse errors
            }
          };
        });
      } catch {
        // Ignore individual relay failure.
      }
    }),
  );

  return latest;
}

export async function fetchLatestCourseEvent(params: {
  relays?: RelayConfig[];
  dTag: string;
  authorPubkey: string;
}): Promise<NostrEvent | null> {
  const relays = params.relays ?? DEFAULT_RELAYS;
  const filters = [
    {
      kinds: [COURSE_EVENT_KIND],
      authors: [params.authorPubkey],
      "#d": [params.dTag],
      limit: 1,
    },
  ];

  const subPayload = ["REQ", "faircredit-course-sub", ...filters] as const;
  const json = JSON.stringify(subPayload);

  let latest: NostrEvent | null = null;

  await Promise.allSettled(
    relays.map(async ({ url }) => {
      try {
        const ws = await openRelay(url);
        ws.send(json);

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve();
          }, 4000);

          ws.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data as string);
              if (Array.isArray(msg) && msg[0] === "EVENT") {
                const event = msg[2] as NostrEvent;
                if (!latest || event.created_at > latest.created_at) {
                  latest = event;
                }
              }
              if (Array.isArray(msg) && msg[0] === "EOSE") {
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            } catch {
              // ignore parse errors
            }
          };
        });
      } catch {
        // ignore relay errors
      }
    }),
  );

  return latest;
}

export async function fetchLatestCourseEventByDTag(params: {
  relays?: RelayConfig[];
  dTag: string;
}): Promise<NostrEvent | null> {
  const relays = params.relays ?? DEFAULT_RELAYS;
  const filters = [
    {
      kinds: [COURSE_EVENT_KIND],
      "#d": [params.dTag],
      limit: 1,
    },
  ];

  const subPayload = ["REQ", "faircredit-course-by-dtag", ...filters] as const;
  const json = JSON.stringify(subPayload);

  let latest: NostrEvent | null = null;

  await Promise.allSettled(
    relays.map(async ({ url }) => {
      try {
        const ws = await openRelay(url);
        ws.send(json);

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve();
          }, 4000);

          ws.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data as string);
              if (Array.isArray(msg) && msg[0] === "EVENT") {
                const event = msg[2] as NostrEvent;
                if (!latest || event.created_at > latest.created_at) {
                  latest = event;
                }
              }
              if (Array.isArray(msg) && msg[0] === "EOSE") {
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            } catch {
              // ignore parse errors
            }
          };
        });
      } catch {
        // ignore relay errors
      }
    }),
  );

  return latest;
}

/**
 * Fetch all resource events for a given author from a set of relays.
 * Intended for multi-device synchronization.
 */
export async function syncAllResourceEventsForAuthor(params: {
  relays?: RelayConfig[];
  authorPubkey: string;
}): Promise<NostrEvent[]> {
  const relays = params.relays ?? DEFAULT_RELAYS;
  const filters = [
    {
      kinds: [RESOURCE_EVENT_KIND],
      authors: [params.authorPubkey],
      "#t": ["faircredit-resource"],
    },
  ];
  const subPayload = ["REQ", "faircredit-resource-sync", ...filters] as const;
  const json = JSON.stringify(subPayload);

  const events: NostrEvent[] = [];

  await Promise.allSettled(
    relays.map(async ({ url }) => {
      try {
        const ws = await openRelay(url);
        ws.send(json);

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve();
          }, 5000);

          ws.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data as string);
              if (Array.isArray(msg) && msg[0] === "EVENT") {
                const event = msg[2] as NostrEvent;
                events.push(event);
              }
              if (Array.isArray(msg) && msg[0] === "EOSE") {
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            } catch {
              // ignore
            }
          };
        });
      } catch {
        // ignore relay error
      }
    }),
  );

  return events;
}

export async function syncAllCourseEventsForAuthor(params: {
  relays?: RelayConfig[];
  authorPubkey: string;
}): Promise<NostrEvent[]> {
  const relays = params.relays ?? DEFAULT_RELAYS;
  const filters = [
    {
      kinds: [COURSE_EVENT_KIND],
      authors: [params.authorPubkey],
      "#t": ["faircredit-course"],
    },
  ];
  const subPayload = ["REQ", "faircredit-course-sync", ...filters] as const;
  const json = JSON.stringify(subPayload);

  const events: NostrEvent[] = [];

  await Promise.allSettled(
    relays.map(async ({ url }) => {
      try {
        const ws = await openRelay(url);
        ws.send(json);

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve();
          }, 5000);

          ws.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data as string);
              if (Array.isArray(msg) && msg[0] === "EVENT") {
                const event = msg[2] as NostrEvent;
                events.push(event);
              }
              if (Array.isArray(msg) && msg[0] === "EOSE") {
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            } catch {
              // ignore parse errors
            }
          };
        });
      } catch {
        // ignore relay error
      }
    }),
  );

  return events;
}

export async function republishEventToRelays(params: {
  event: NostrEvent;
  relays?: RelayConfig[];
}): Promise<void> {
  const relays = params.relays ?? DEFAULT_RELAYS;
  const payload = ["EVENT", params.event] as const;
  const json = JSON.stringify(payload);

  await Promise.allSettled(
    relays.map(async ({ url }) => {
      try {
        const ws = await openRelay(url);
        ws.send(json);
        setTimeout(() => ws.close(), 2000);
      } catch {
        // ignore relay error
      }
    }),
  );
}

export async function ensureCourseEventAvailable(params: {
  dTag: string;
  relays?: RelayConfig[];
}): Promise<NostrEvent | null> {
  const relays = params.relays ?? DEFAULT_RELAYS;

  // Try cache first
  const cached = loadCachedCourseEventByDTag(params.dTag);

  // Check network for the latest copy
  const latest = await fetchLatestCourseEventByDTag({
    relays,
    dTag: params.dTag,
  });

  if (latest) {
    // Refresh cache with the latest online copy
    saveCourseEventByDTag(params.dTag, latest);
    return latest;
  }

  // If the event is missing from relays but present in cache, republish it.
  if (cached) {
    await republishEventToRelays({ event: cached, relays });
    return cached;
  }

  return null;
}

/**
 * Build a stable d-tag from the resource pubkey and created timestamp.
 * Convention: base58(resourcePubkey) + ":" + created
 */
export function buildResourceDTag(params: {
  resourcePubkey: Address<string>;
  created: number;
}): string {
  return `${params.resourcePubkey}:${params.created}`;
}

/**
 * Build a stable d-tag from the course pubkey and creation timestamp.
 * Convention: base58(coursePubkey) + ":" + creationTimestamp
 */
export function buildCourseDTag(params: {
  coursePubkey: Address<string>;
  creationTimestamp: number;
}): string {
  return `${params.coursePubkey}:${params.creationTimestamp}`;
}
