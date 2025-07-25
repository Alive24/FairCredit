"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CustomWalletModalProps {
  visible: boolean
  onClose: () => void
}

export function CustomWalletModal({ visible, onClose }: CustomWalletModalProps) {
  const { wallets, select, connect, connecting, wallet } = useWallet()
  
  // Filter to only show Solana-specific wallets we want to support
  const filteredWallets = wallets.filter(wallet => {
    const name = wallet.adapter.name.toLowerCase()
    return (
      (name.includes('phantom') || name.includes('solflare')) &&
      !name.includes('metamask') &&
      wallet.readyState !== 'Unsupported'
    )
  })

  // Remove duplicates by name
  const uniqueWallets = filteredWallets.filter((wallet, index, arr) => 
    arr.findIndex(w => w.adapter.name === wallet.adapter.name) === index
  )

  const handleWalletSelect = async (walletName: string) => {
    try {
      console.log(`🔧 Selecting wallet: ${walletName}`)
      
      // First select the wallet
      await select(walletName as any)
      
      // Wait a bit for the selection to register
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Then use the useWallet connect method
      console.log('🔧 Attempting to connect...')
      await connect()
      
      console.log('✅ Wallet connected successfully')
      onClose()
    } catch (error) {
      console.error('❌ Error connecting wallet:', error)
      // Show error message but don't close modal
      alert(`Failed to connect to ${walletName}. Please make sure the wallet extension is installed and try again.`)
    }
  }

  const getWalletIcon = (walletName: string) => {
    if (walletName.toLowerCase().includes('phantom')) {
      return '👻'
    }
    if (walletName.toLowerCase().includes('solflare')) {
      return '☀️'
    }
    return '💼'
  }

  const getWalletStatus = (readyState: string) => {
    switch (readyState) {
      case 'Installed':
        return { text: 'Detected', color: 'text-green-600' }
      case 'NotDetected':
        return { text: 'Not Installed', color: 'text-orange-600' }
      case 'Loadable':
        return { text: 'Available', color: 'text-blue-600' }
      default:
        return { text: readyState, color: 'text-gray-600' }
    }
  }

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a Wallet</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {uniqueWallets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No compatible wallets detected.</p>
              <p className="text-sm mt-2">
                Please install Phantom or Solflare browser extension.
              </p>
            </div>
          ) : (
            uniqueWallets.map((wallet) => {
              const status = getWalletStatus(wallet.readyState)
              const isAvailable = wallet.readyState === 'Installed' || wallet.readyState === 'Loadable'
              
              return (
                <Button
                  key={wallet.adapter.name}
                  onClick={() => handleWalletSelect(wallet.adapter.name)}
                  disabled={!isAvailable || connecting}
                  variant="outline"
                  className="w-full justify-start p-4 h-auto"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="text-2xl">
                      {getWalletIcon(wallet.adapter.name)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{wallet.adapter.name}</div>
                      <div className={`text-xs ${status.color}`}>
                        {status.text}
                      </div>
                    </div>
                    {connecting && (
                      <div className="text-xs text-muted-foreground">
                        Connecting...
                      </div>
                    )}
                  </div>
                </Button>
              )
            })
          )}
        </div>
        
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Don't have a wallet?</p>
          <div className="flex gap-4 justify-center">
            <a 
              href="https://phantom.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Get Phantom
            </a>
            <a 
              href="https://solflare.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Get Solflare
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}