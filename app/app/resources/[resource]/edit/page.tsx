"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFairCredit } from "@/hooks/use-fair-credit";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { createPlaceholderSigner } from "@/lib/solana/placeholder-signer";
import { address, type Address } from "@solana/kit";
import { fetchMaybeResource } from "@/lib/solana/generated/accounts/resource";
import { getSetResourceNostrRefInstruction } from "@/lib/solana/generated/instructions/setResourceNostrRef";
import { getSetResourceWalrusRefInstruction } from "@/lib/solana/generated/instructions/setResourceWalrusRef";
import { useResourceDraft } from "@/hooks/use-resource-draft";
import {
  fetchLatestResourceEvent,
  publishResourceEvent,
} from "@/lib/nostr/client";
import { uploadToWalrus } from "@/lib/walrus/upload";

function hexToBytes32(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("Invalid Nostr pubkey (expected 64 hex chars)");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export default function ResourceEditPage() {
  const { toast } = useToast();
  const params = useParams<{ resource: string }>();
  const resourceAddressRaw = params?.resource;
  const resourceAddress = useMemo(
    () => (typeof resourceAddressRaw === "string" ? resourceAddressRaw : null),
    [resourceAddressRaw]
  );

  const { rpc } = useFairCredit();
  const { address: walletAddress, isConnected } = useAppKitAccount();
  const { sendTransaction, isSending } = useAppKitTransaction();

  const { content, setContent, lastSavedAt, loaded } =
    useResourceDraft(resourceAddress);

  const [loadingOnChain, setLoadingOnChain] = useState(false);
  const [resource, setResource] = useState<Awaited<
    ReturnType<typeof fetchMaybeResource>
  > | null>(null);

  const [forceRebind, setForceRebind] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const lastAutoPublishAtRef = useRef<number>(0);
  const lastAutoSyncAtRef = useRef<number>(0);

  const loadResource = useCallback(async () => {
    if (!resourceAddress) return;
    setLoadingOnChain(true);
    try {
      const acc = await fetchMaybeResource(rpc, address(resourceAddress));
      setResource(acc);
    } finally {
      setLoadingOnChain(false);
    }
  }, [rpc, resourceAddress]);

  useEffect(() => {
    loadResource().catch((e) => {
      console.error("Failed to load resource:", e);
      toast({
        title: "Failed to load resource",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    });
  }, [loadResource, toast]);

  const onChainData = resource?.exists ? resource.data : null;
  const nostrDTag =
    onChainData?.nostrDTag?.__option === "Some"
      ? onChainData.nostrDTag.value
      : null;
  const walrusBlobId =
    onChainData?.walrusBlobId?.__option === "Some"
      ? onChainData.walrusBlobId.value
      : null;
  const nostrAuthorHex = useMemo(() => {
    const b = onChainData?.nostrAuthorPubkey;
    if (!b) return null;
    const allZero = b.every((x) => x === 0);
    if (allZero) return null;
    return Array.from(b)
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }, [onChainData?.nostrAuthorPubkey]);

  const publishToNostrAndBind = useCallback(async () => {
    if (!resourceAddress) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description:
          "Connect your wallet to publish and bind Nostr references.",
        variant: "destructive",
      });
      return;
    }
    if (!onChainData) {
      toast({
        title: "Resource not found",
        description: "Load the on-chain resource first.",
        variant: "destructive",
      });
      return;
    }
    if (!content.trim()) {
      toast({
        title: "Empty content",
        description: "Write something before publishing.",
        variant: "destructive",
      });
      return;
    }

    setBusy("publish");
    try {
      const created = Number(onChainData.created);
      const dTag = `faircredit:resource:${resourceAddress}:${created}`;
      const published = await publishResourceEvent({ dTag, content });
      const authorBytes = hexToBytes32(published.authorPubkey);

      const ix = getSetResourceNostrRefInstruction({
        resource: address(resourceAddress),
        authority: createPlaceholderSigner(walletAddress),
        nostrDTag: dTag,
        nostrAuthorPubkey: authorBytes,
        force: forceRebind,
      });
      await sendTransaction([ix]);

      toast({
        title: "Published and bound",
        description: `Published to Nostr and updated on-chain pointer (event=${published.eventId.slice(
          0,
          8
        )}…).`,
      });
      await loadResource();
    } catch (e) {
      console.error("Publish/bind failed:", e);
      toast({
        title: "Publish/bind failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [
    content,
    forceRebind,
    isConnected,
    loadResource,
    onChainData,
    resourceAddress,
    sendTransaction,
    toast,
    walletAddress,
  ]);

  const syncFromNostr = useCallback(async () => {
    if (!nostrDTag || !nostrAuthorHex) {
      toast({
        title: "Nostr reference not set",
        description: "This resource has no Nostr pointer on-chain yet.",
        variant: "destructive",
      });
      return;
    }

    setBusy("sync");
    try {
      const event = await fetchLatestResourceEvent({
        dTag: nostrDTag,
        authorPubkey: nostrAuthorHex,
      });
      if (!event) {
        toast({
          title: "No event found",
          description: "No matching Nostr event found on the default relays.",
          variant: "destructive",
        });
        return;
      }
      setContent(event.content);
      toast({
        title: "Synced from Nostr",
        description: `Loaded latest content (event=${event.id.slice(0, 8)}…).`,
      });
    } catch (e) {
      console.error("Nostr sync failed:", e);
      toast({
        title: "Nostr sync failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [nostrAuthorHex, nostrDTag, setContent, toast]);

  const finalizeToWalrus = useCallback(async () => {
    if (!resourceAddress) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description:
          "Connect your wallet to finalize and bind a Walrus reference.",
        variant: "destructive",
      });
      return;
    }
    if (!onChainData) return;

    setBusy("walrus");
    try {
      const bundle = {
        type: "faircredit-resource",
        resource: resourceAddress,
        created: Number(onChainData.created),
        updatedAt: Date.now(),
        content,
      };
      const uploaded = await uploadToWalrus(bundle);

      const ix = getSetResourceWalrusRefInstruction({
        resource: address(resourceAddress),
        authority: createPlaceholderSigner(walletAddress),
        walrusBlobId: uploaded.blobId,
      });
      await sendTransaction([ix]);

      toast({
        title: "Finalized to Walrus",
        description: `Walrus blobId saved on-chain (${uploaded.blobId}).`,
      });
      await loadResource();
    } catch (e) {
      console.error("Walrus finalize failed:", e);
      toast({
        title: "Finalize failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }, [
    content,
    isConnected,
    loadResource,
    onChainData,
    resourceAddress,
    sendTransaction,
    toast,
    walletAddress,
  ]);

  // Best-effort initial sync if we have no local draft.
  useEffect(() => {
    if (!loaded) return;
    if (!content.trim() && nostrDTag && nostrAuthorHex) {
      syncFromNostr().catch(() => {
        // ignore
      });
    }
  }, [content, loaded, nostrAuthorHex, nostrDTag, syncFromNostr]);

  // Periodic Nostr availability check + best-effort rebroadcast/sync.
  useEffect(() => {
    if (!loaded) return;
    if (!nostrDTag || !nostrAuthorHex) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      const now = Date.now();

      // Rate-limit to avoid aggressive relay traffic.
      if (now - lastAutoSyncAtRef.current < 25_000) return;
      lastAutoSyncAtRef.current = now;

      try {
        const event = await fetchLatestResourceEvent({
          dTag: nostrDTag,
          authorPubkey: nostrAuthorHex,
        });

        // If not found on relays but we have local content, try rebroadcast.
        if (!event) {
          if (content.trim() && now - lastAutoPublishAtRef.current > 60_000) {
            try {
              await publishResourceEvent({ dTag: nostrDTag, content });
              lastAutoPublishAtRef.current = now;
            } catch {
              // If NIP-07 signer isn't available, we can't rebroadcast.
            }
          }
          return;
        }

        const remoteUpdatedAt = event.created_at * 1000;
        const localUpdatedAt = lastSavedAt ?? 0;
        const driftMs = 2_000;

        // Prefer the newer side based on timestamps.
        if (remoteUpdatedAt > localUpdatedAt + driftMs) {
          setContent(event.content);
          return;
        }

        if (
          localUpdatedAt > remoteUpdatedAt + driftMs &&
          content.trim() &&
          now - lastAutoPublishAtRef.current > 60_000
        ) {
          try {
            await publishResourceEvent({ dTag: nostrDTag, content });
            lastAutoPublishAtRef.current = now;
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [content, lastSavedAt, loaded, nostrAuthorHex, nostrDTag, setContent]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Resource:</strong>{" "}
              {resourceAddress ? resourceAddress : "(missing)"}
            </div>
            <div>
              <strong>On-chain:</strong>{" "}
              {loadingOnChain
                ? "Loading…"
                : resource?.exists
                ? "Loaded"
                : "Not found"}
            </div>
            {resource?.exists && (
              <>
                <div>
                  <strong>Owner:</strong> {String(onChainData?.owner)}
                </div>
                <div>
                  <strong>Nostr dTag:</strong> {nostrDTag ?? "(not set)"}
                </div>
                <div>
                  <strong>Nostr author:</strong>{" "}
                  {nostrAuthorHex
                    ? `${nostrAuthorHex.slice(0, 16)}…`
                    : "(not set)"}
                </div>
                <div>
                  <strong>Walrus blobId:</strong> {walrusBlobId ?? "(not set)"}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Draft</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your resource content here…"
              rows={16}
            />
            <div className="text-xs text-muted-foreground">
              {loaded
                ? lastSavedAt
                  ? `Saved locally ${new Date(
                      lastSavedAt
                    ).toLocaleTimeString()}`
                  : "Local draft ready"
                : "Loading local draft…"}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                onClick={syncFromNostr}
                variant="outline"
                disabled={busy != null || isSending}
              >
                {busy === "sync" ? "Syncing…" : "Sync from Nostr"}
              </Button>
              <Button
                onClick={publishToNostrAndBind}
                disabled={busy != null || isSending}
              >
                {busy === "publish" ? "Publishing…" : "Publish to Nostr + Bind"}
              </Button>
              <Button
                onClick={finalizeToWalrus}
                variant="secondary"
                disabled={busy != null || isSending}
              >
                {busy === "walrus"
                  ? "Finalizing…"
                  : "Finalize to Walrus + Bind"}
              </Button>
              <label className="ml-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={forceRebind}
                  onChange={(e) => setForceRebind(e.target.checked)}
                />
                Force rebind Nostr pointer
              </label>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
