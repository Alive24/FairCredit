"use client"

import { WalletProvider } from "@/components/wallet-provider"
import { FairCreditProvider } from "@/lib/solana/context"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <FairCreditProvider>
        {children}
      </FairCreditProvider>
    </WalletProvider>
  )
}