"use client"

import type React from "react"
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter
} from "@solana/wallet-adapter-wallets"
import { useMemo } from "react"
import { FairCreditProvider } from "@/lib/solana/context"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => {
    if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    }
    return "https://api.devnet.solana.com"
  }, [])

  const wallets = useMemo(() => {
    // Only include specific, well-tested Solana wallets to avoid conflicts
    const walletAdapters = [
      new PhantomWalletAdapter({ network: 'devnet' }),
      new SolflareWalletAdapter({ network: 'devnet' }),
    ]
    
    // Debug logging to see what wallets we're actually using
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Wallet adapters loaded:', walletAdapters.map(w => w.name))
    }
    
    return walletAdapters
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={false}
        localStorageKey="wallet-adapter"
        onError={(error) => {
          console.error('Wallet error:', error)
        }}
      >
        <WalletModalProvider
          featuredWallets={[]}
        >
          <FairCreditProvider>
            {children}
          </FairCreditProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
