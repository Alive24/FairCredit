"use client";

import type { Address } from "@solana/kit";

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

// Application-specific kind used to filter resource events.
const RESOURCE_EVENT_KIND = 30000;

type WebSocketLike = WebSocket;

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

// Demo-only helper: use a browser-side signer (e.g. NIP-07 extension) to sign the event.
async function signEventWithNip07(
  draft: Omit<NostrEvent, "id" | "sig">,
): Promise<NostrEvent> {
  const anyWindow = window as unknown as {
    nostr?: {
      signEvent: (event: Omit<NostrEvent, "id" | "sig">) => Promise<NostrEvent>;
    };
  };
  if (!anyWindow.nostr?.signEvent) {
    throw new Error("Nostr signer (NIP-07) not available in this browser");
  }
  return anyWindow.nostr.signEvent(draft);
}

export async function publishResourceEvent(params: {
  relays?: RelayConfig[];
  dTag: string;
  content: string;
}): Promise<PublishResult> {
  const relays = params.relays ?? DEFAULT_RELAYS;
  const createdAt = Math.floor(Date.now() / 1000);

  const draft: Omit<NostrEvent, "id" | "sig"> = {
    pubkey: "",
    kind: RESOURCE_EVENT_KIND,
    created_at: createdAt,
    tags: [
      ["d", params.dTag],
      ["t", "faircredit-resource"],
    ],
    content: params.content,
  } as unknown as Omit<NostrEvent, "id" | "sig">;

  const event = await signEventWithNip07(draft);

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

