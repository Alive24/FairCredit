"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useFairCredit } from "@/lib/solana/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"  
import { Button } from "@/components/ui/button"

export function WalletDebugEnhanced() {
  const wallet = useWallet()
  const { client, providerClient, hubClient, verifierClient, mentorClient, isLoading, error } = useFairCredit()
  const { setVisible, visible } = useWalletModal()
  const [phantomDetected, setPhantomDetected] = useState(false)

  useEffect(() => {
    // Check if Phantom is installed
    const checkPhantom = () => {
      if (typeof window !== 'undefined') {
        const isPhantom = !!(window as any).phantom?.solana?.isPhantom
        setPhantomDetected(isPhantom)
        console.log('🔍 Phantom detected:', isPhantom)
        console.log('🔍 Window phantom object:', (window as any).phantom)
      }
    }

    checkPhantom()
    // Check again after a delay in case the extension loads late
    const timer = setTimeout(checkPhantom, 1000)
    return () => clearTimeout(timer)
  }, [])

  const testWalletModal = () => {
    console.log('🧪 Testing wallet modal...')
    console.log('Modal visible before:', visible)
    setVisible(true)
    console.log('Modal setVisible(true) called')
  }

  const testDirectPhantom = async () => {
    console.log('🧪 Testing direct Phantom connection...')
    try {
      if ((window as any).phantom?.solana) {
        const response = await (window as any).phantom.solana.connect()
        console.log('✅ Direct Phantom connection:', response)
      } else {
        console.log('❌ Phantom not found')
      }
    } catch (error) {
      console.error('❌ Direct Phantom error:', error)
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Enhanced Wallet Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <strong>Phantom Detected:</strong> {phantomDetected ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Modal Visible:</strong> {visible ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Wallet Connected:</strong> {wallet.connected ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Public Key:</strong> {wallet.publicKey?.toBase58() || "None"}
        </div>
        <div>
          <strong>Wallet Name:</strong> {wallet.wallet?.adapter?.name || "None"}
        </div>
        <div>
          <strong>Connecting:</strong> {wallet.connecting ? "⏳ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Clients Loading:</strong> {isLoading ? "⏳ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Readonly Client:</strong> {client ? "✅ Ready" : "❌ Not Ready"}
        </div>
        <div>
          <strong>Provider Client:</strong> {providerClient ? "✅ Ready" : "❌ Not Ready"}
        </div>
        <div>
          <strong>Hub Client:</strong> {hubClient ? "✅ Ready" : "❌ Not Ready"}
        </div>
        <div>
          <strong>Verifier Client:</strong> {verifierClient ? "✅ Ready" : "❌ Not Ready"}
        </div>
        <div>
          <strong>Mentor Client:</strong> {mentorClient ? "✅ Ready" : "❌ Not Ready"}
        </div>
        <div>
          <strong>Available Wallets:</strong> {wallet.wallets.length} ({wallet.wallets.map(w => w.adapter.name).join(", ")})
        </div>
        {wallet.wallets.map(w => (
          <div key={w.adapter.name} className="text-xs ml-4">
            • {w.adapter.name}: {w.readyState}
          </div>
        ))}
        {error && (
          <div className="text-red-500">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div className="pt-4 space-y-2">
          <Button onClick={testWalletModal} variant="outline" size="sm" className="w-full">
            🧪 Test Wallet Modal
          </Button>
          <Button onClick={testDirectPhantom} variant="outline" size="sm" className="w-full">
            🧪 Test Direct Phantom
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
