"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { useState } from "react"
import { CustomWalletModal } from "@/components/custom-wallet-modal"

export function WalletButton() {
  const { wallet, disconnect, connecting, connected, publicKey, wallets } = useWallet()
  const [showModal, setShowModal] = useState(false)

  const handleClick = () => {
    if (connected) {
      disconnect()
    } else {
      console.log('🔧 Opening wallet modal...')
      console.log('Available wallets:', wallets.map(w => ({ name: w.adapter.name, readyState: w.readyState })))
      setShowModal(true)
    }
  }

  const getButtonText = () => {
    if (connecting) return "Connecting..."
    if (connected && publicKey) {
      const address = publicKey.toBase58()
      return `${address.slice(0, 4)}...${address.slice(-4)}`
    }
    return "Connect Wallet"
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant={connected ? "outline" : "default"}
        className="flex items-center gap-2"
        disabled={connecting}
      >
        <Wallet className="h-4 w-4" />
        {getButtonText()}
      </Button>
      
      <CustomWalletModal 
        visible={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  )
}
