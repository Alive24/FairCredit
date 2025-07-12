"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export function WalletButton() {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")

  const connectWallet = async () => {
    // Simulate wallet connection
    setIsConnected(true)
    setWalletAddress("7xKX...9mNp")
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setWalletAddress("")
  }

  return (
    <Button
      onClick={isConnected ? disconnectWallet : connectWallet}
      variant={isConnected ? "outline" : "default"}
      className="flex items-center gap-2"
    >
      <Wallet className="h-4 w-4" />
      {isConnected ? walletAddress : "Connect Wallet"}
    </Button>
  )
}
