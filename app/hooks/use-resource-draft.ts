"use client";

import { useEffect, useState } from "react";
import {
  deleteResourceDraft,
  getResourceDraft,
  setResourceDraft,
  type ResourceDraft,
} from "@/lib/drafts/resourceDraftStore";

type UseResourceDraftOptions = {
  /** Autosave interval in milliseconds. Default: 1000ms */
  autosaveIntervalMs?: number;
};

export function useResourceDraft(
  resourcePubkey: string | null | undefined,
  options?: UseResourceDraftOptions,
) {
  const [content, setContent] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const autosaveIntervalMs = options?.autosaveIntervalMs ?? 1000;

  // Initial load: restore draft from IndexedDB if it exists.
  useEffect(() => {
    let cancelled = false;
    if (!resourcePubkey) {
      setLoaded(true);
      return;
    }

    (async () => {
      try {
        const draft: ResourceDraft | null = await getResourceDraft(resourcePubkey);
        if (!cancelled && draft) {
          setContent(draft.content);
          setLastSavedAt(draft.updatedAt);
        }
      } catch {
        // Ignore read failures to avoid breaking the editing experience.
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resourcePubkey]);

  // Autosave to IndexedDB using a timer to avoid writing on every keystroke.
  useEffect(() => {
    if (!resourcePubkey) return;
    if (!loaded) return;

    const handle = setTimeout(async () => {
      try {
        await setResourceDraft(resourcePubkey, content);
        setLastSavedAt(Date.now());
      } catch {
        // Ignore write failures to avoid interrupting the editing experience.
      }
    }, autosaveIntervalMs);

    return () => clearTimeout(handle);
  }, [content, resourcePubkey, autosaveIntervalMs, loaded]);

  const clearDraft = async () => {
    if (!resourcePubkey) return;
    await deleteResourceDraft(resourcePubkey);
    setLastSavedAt(null);
  };

  return {
    content,
    setContent,
    lastSavedAt,
    loaded,
    clearDraft,
  };
}

