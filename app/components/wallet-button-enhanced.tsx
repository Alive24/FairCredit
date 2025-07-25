"use client"

import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { useState } from "react"

export function WalletButtonEnhanced() {
  const { setVisible } = useWalletModal()
  const { wallet, disconnect, connecting, connected, publicKey, select, wallets } = useWallet()
  const [isModalFallback, setIsModalFallback] = useState(false)

  const handleClick = async () => {
    if (connected) {
      disconnect()
      return
    }

    console.log('🔧 Opening wallet modal...')
    console.log('Available wallets:', wallets.map(w => ({ name: w.adapter.name, readyState: w.readyState })))
    
    // Try modal first
    setVisible(true)
    
    // If modal doesn't show after a short delay, show fallback
    setTimeout(() => {
      const modalElement = document.querySelector('.wallet-adapter-modal-wrapper')
      if (!modalElement || getComputedStyle(modalElement).display === 'none') {
        console.log('⚠️ Modal not visible, showing fallback')
        setIsModalFallback(true)
      }
    }, 500)
  }

  const connectDirectly = async (walletName: string) => {
    try {
      console.log(`🔧 Connecting directly to ${walletName}`)
      const selectedWallet = wallets.find(w => w.adapter.name === walletName)
      if (selectedWallet) {
        await select(selectedWallet.adapter.name as any)
      }
      setIsModalFallback(false)
    } catch (error) {
      console.error(`❌ Failed to connect to ${walletName}:`, error)
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

      {/* Fallback wallet selection */}
      {isModalFallback && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-background rounded-lg shadow-xl border border-border p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Connect Wallet</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalFallback(false)}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-2">
              {wallets.map((w) => (
                <Button
                  key={w.adapter.name}
                  onClick={() => connectDirectly(w.adapter.name)}
                  variant="outline"
                  className="w-full justify-start p-4"
                  disabled={w.readyState !== 'Installed'}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center text-xs">
                      {w.adapter.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{w.adapter.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {w.readyState === 'Installed' ? 'Ready' : 'Not Installed'}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground text-center">
              If your wallet doesn't appear, make sure the browser extension is installed and enabled.
            </div>
          </div>
        </div>
      )}
    </>
  )
}