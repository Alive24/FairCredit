"use client"

import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export function WalletButton() {
  const { setVisible } = useWalletModal()
  const { wallet, disconnect, connecting, connected, publicKey } = useWallet()

  const handleClick = () => {
    if (connected) {
      disconnect()
    } else {
      setVisible(true)
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
    <Button
      onClick={handleClick}
      variant={connected ? "outline" : "default"}
      className="flex items-center gap-2"
      disabled={connecting}
    >
      <Wallet className="h-4 w-4" />
      {getButtonText()}
    </Button>
  )
}
