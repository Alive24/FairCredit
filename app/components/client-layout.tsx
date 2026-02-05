"use client";

import { TransactionMonitor } from "@/components/transactions/transaction-monitor";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TransactionMonitor variant="floating" />
    </>
  );
}
