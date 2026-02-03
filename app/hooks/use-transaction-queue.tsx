"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Instruction } from "@solana/kit";
import { useAppKitTransaction } from "@/hooks/use-appkit-transaction";
import { useToast } from "@/hooks/use-toast";

type QueueEntry = {
  id: string;
  module: string;
  label: string;
  build: () => Promise<Instruction | Instruction[]>;
  createdAt: number;
};

type QueueSnapshot = Pick<QueueEntry, "module" | "label" | "createdAt">;

type SubmittedTransaction = {
  signature: string;
  submittedAt: number;
  operations: QueueSnapshot[];
  instructionCount: number;
};

type TransactionQueueContextValue = {
  pending: QueueEntry[];
  isSubmitting: boolean;
  combineSubmit: boolean;
  lastError: Error | null;
  lastSignature: string | null;
  history: SubmittedTransaction[];
  enqueue: (
    entry: Omit<QueueEntry, "id" | "createdAt"> & { id?: string }
  ) => void;
  remove: (id: string) => void;
  clear: () => void;
  submitPending: () => Promise<void>;
  setCombineSubmit: (value: boolean) => void;
  clearHistory: () => void;
};

const TransactionQueueContext =
  createContext<TransactionQueueContextValue | null>(null);

const HISTORY_STORAGE_KEY = "faircredit.transaction-history";
const MAX_HISTORY_ENTRIES = 20;

export function TransactionQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const { sendTransaction, isSending } = useAppKitTransaction();
  const [pending, setPending] = useState<QueueEntry[]>([]);
  const [combineSubmit, setCombineSubmit] = useState(true);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const pendingRef = useRef<QueueEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<SubmittedTransaction[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as SubmittedTransaction[];
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, MAX_HISTORY_ENTRIES);
    } catch (error) {
      console.warn("Failed to parse transaction history", error);
      return [];
    }
  });

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const enqueue = useCallback(
    (entry: Omit<QueueEntry, "id" | "createdAt"> & { id?: string }) => {
      setPending((prev) => [
        ...prev,
        {
          ...entry,
          id: entry.id ?? crypto.randomUUID(),
          createdAt: Date.now(),
        },
      ]);
    },
    []
  );

  const remove = useCallback((id: string) => {
    setPending((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setPending([]);
    setLastError(null);
    setLastSignature(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, []);

  const submitPending = useCallback(async () => {
    if (pendingRef.current.length === 0 || !sendTransaction) {
      return;
    }
    setIsSubmitting(true);
    setLastError(null);
    try {
      const instructions: Instruction[] = [];
      for (const entry of pendingRef.current) {
        const built = await entry.build();
        if (Array.isArray(built)) {
          instructions.push(...built);
        } else {
          instructions.push(built);
        }
      }
      if (instructions.length === 0) {
        setPending([]);
        return;
      }
      const operationsSnapshot: QueueSnapshot[] = pendingRef.current.map(
        ({ module, label, createdAt }) => ({
          module,
          label,
          createdAt,
        })
      );
      const signature = await sendTransaction(instructions);
      setLastSignature(signature);
      setHistory((prev) => {
        const next: SubmittedTransaction[] = [
          {
            signature,
            submittedAt: Date.now(),
            operations: operationsSnapshot,
            instructionCount: instructions.length,
          },
          ...prev,
        ];
        return next.slice(0, MAX_HISTORY_ENTRIES);
      });
      setPending([]);
      toast({
        title: "Transaction submitted",
        description: `Signature: ${signature.slice(0, 8)}...`,
      });
    } catch (error) {
      console.error("Transaction queue error", error);
      const err = error instanceof Error ? error : new Error(String(error));
      setLastError(err);
      toast({
        title: "Transaction failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [sendTransaction, toast]);

  useEffect(() => {
    if (
      combineSubmit &&
      pendingRef.current.length > 0 &&
      !isSubmitting &&
      !isSending
    ) {
      submitPending();
    }
  }, [combineSubmit, submitPending, isSubmitting, isSending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(history.slice(0, MAX_HISTORY_ENTRIES))
      );
    } catch (error) {
      console.warn("Failed to persist transaction history", error);
    }
  }, [history]);

  const value = useMemo<TransactionQueueContextValue>(
    () => ({
      pending,
      isSubmitting: isSubmitting || isSending,
      combineSubmit,
      lastError,
      lastSignature,
      history,
      enqueue,
      remove,
      clear,
      submitPending,
      setCombineSubmit,
      clearHistory,
    }),
    [
      pending,
      isSubmitting,
      isSending,
      combineSubmit,
      lastError,
      lastSignature,
      history,
      enqueue,
      remove,
      clear,
      submitPending,
      clearHistory,
    ]
  );

  return (
    <TransactionQueueContext.Provider value={value}>
      {children}
    </TransactionQueueContext.Provider>
  );
}

export function useTransactionQueue() {
  const context = useContext(TransactionQueueContext);
  if (!context) {
    throw new Error(
      "useTransactionQueue must be used within a TransactionQueueProvider"
    );
  }
  return context;
}
