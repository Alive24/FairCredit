"use client"

import type React from "react"

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
import { useMemo } from "react"
import { FairCreditProvider } from "@/lib/solana/context"
import { RealDevWalletAdapter } from "@/lib/solana/real-dev-wallet"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Use devnet for testing real transactions
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    }
    // Default to devnet for testing
    return "https://api.devnet.solana.com"
  }, [])

  const wallets = useMemo(() => {
    const walletList = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
    
    // Add dev wallet in development for automated testing
    if (process.env.NODE_ENV === 'development') {
      walletList.push(new RealDevWalletAdapter() as any)
    }
    
    return walletList
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <FairCreditProvider>
            {children}
          </FairCreditProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
