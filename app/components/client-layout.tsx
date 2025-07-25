"use client"

import { WalletProvider } from "@/components/wallet-provider"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  )
}