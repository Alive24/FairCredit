"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { address } from "@solana/kit";
import { fetchMaybeAsset } from "@/lib/solana/generated/accounts/asset";
import { getSetAssetNostrRefInstruction } from "@/lib/solana/generated/instructions/setAssetNostrRef";
import { getSetAssetWalrusRefInstruction } from "@/lib/solana/generated/instructions/setAssetWalrusRef";
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

export default function AssetEditPage() {
  const { toast } = useToast();
  const params = useParams<{ asset: string }>();
  const assetAddressRaw = params?.asset;
  const assetAddress = useMemo(
    () => (typeof assetAddressRaw === "string" ? assetAddressRaw : null),
    [assetAddressRaw]
  );

  const { rpc } = useFairCredit();
  const { address: walletAddress, isConnected } = useAppKitAccount();
  const { sendTransaction, isSending } = useAppKitTransaction();

  const [content, setContent] = useState("");
  const [loadingOnChain, setLoadingOnChain] = useState(false);
  const [asset, setAsset] = useState<Awaited<
    ReturnType<typeof fetchMaybeAsset>
  > | null>(null);
  const [forceRebind, setForceRebind] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadAsset = useCallback(async () => {
    if (!assetAddress) return;
    setLoadingOnChain(true);
    try {
      const acc = await fetchMaybeAsset(rpc, address(assetAddress));
      setAsset(acc);
    } finally {
      setLoadingOnChain(false);
    }
  }, [rpc, assetAddress]);

  useEffect(() => {
    loadAsset().catch((e) => {
      console.error("Failed to load asset:", e);
      toast({
        title: "Failed to load asset",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    });
  }, [loadAsset, toast]);

  const onChainData = asset?.exists ? asset.data : null;
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

  const syncFromNostr = useCallback(async () => {
    if (!nostrDTag || !nostrAuthorHex) {
      toast({
        title: "Nostr reference not set",
        description: "This asset has no Nostr pointer on-chain yet.",
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
  }, [nostrAuthorHex, nostrDTag, toast]);

  const publishToNostrAndBind = useCallback(async () => {
    if (!assetAddress || !onChainData) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description:
          "Connect your wallet to publish and bind Nostr references.",
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
      const dTag = `faircredit:asset:${assetAddress}:${created}`;
      const published = await publishResourceEvent({ dTag, content });
      const authorBytes = hexToBytes32(published.authorPubkey);

      const ix = getSetAssetNostrRefInstruction({
        asset: address(assetAddress),
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
      await loadAsset();
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
    assetAddress,
    content,
    forceRebind,
    isConnected,
    loadAsset,
    onChainData,
    sendTransaction,
    toast,
    walletAddress,
  ]);

  const finalizeToWalrus = useCallback(async () => {
    if (!assetAddress || !onChainData) return;
    if (!walletAddress || !isConnected) {
      toast({
        title: "Wallet not connected",
        description:
          "Connect your wallet to finalize and bind a Walrus reference.",
        variant: "destructive",
      });
      return;
    }

    setBusy("walrus");
    try {
      const bundle = {
        type: "faircredit-asset",
        asset: assetAddress,
        created: Number(onChainData.created),
        updatedAt: Date.now(),
        content,
      };
      const uploaded = await uploadToWalrus(bundle);

      const ix = getSetAssetWalrusRefInstruction({
        asset: address(assetAddress),
        authority: createPlaceholderSigner(walletAddress),
        walrusBlobId: uploaded.blobId,
      });
      await sendTransaction([ix]);

      toast({
        title: "Finalized to Walrus",
        description: `Walrus blobId saved on-chain (${uploaded.blobId}).`,
      });
      await loadAsset();
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
    assetAddress,
    content,
    isConnected,
    loadAsset,
    onChainData,
    sendTransaction,
    toast,
    walletAddress,
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Asset Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Asset:</strong>{" "}
              {assetAddress ? assetAddress : "(missing)"}
            </div>
            <div>
              <strong>On-chain:</strong>{" "}
              {loadingOnChain
                ? "Loading…"
                : asset?.exists
                ? "Loaded"
                : "Not found"}
            </div>
            {asset?.exists && (
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
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write asset notes or metadata here…"
              rows={12}
            />
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
