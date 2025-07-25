"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useFairCredit } from "@/lib/solana/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function WalletDebug() {
  const wallet = useWallet()
  const { client, hubClient, fullClient, providerClient, isLoading, error } = useFairCredit()

  const testDirectConnection = async () => {
    try {
      console.log('🧪 Testing direct connection...')
      
      // First, try to select Phantom
      const phantomWallet = wallet.wallets.find(w => w.adapter.name === 'Phantom')
      if (phantomWallet) {
        console.log('🔧 Found Phantom wallet, selecting...')
        await wallet.select('Phantom' as any)
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 500))
        
        console.log('🔧 Now attempting to connect...')
        await wallet.connect()
        
        console.log('✅ Direct connection successful!')
      } else {
        console.log('❌ Phantom wallet not found')
      }
    } catch (error) {
      console.error('❌ Direct connection failed:', error)
    }
  }

  const checkBrowserExtensions = () => {
    console.log('🔍 Checking browser extensions...')
    const win = window as any
    const extensions = {
      solana: !!win.solana,
      phantom: !!win.phantom,
      solflare: !!win.solflare,
      polkadot: !!win.injectedWeb3,
      ethereum: !!win.ethereum,
    }
    console.log('Browser extensions detected:', extensions)
    
    // Check for specific polkadot extensions
    if (win.injectedWeb3) {
      console.log('Polkadot extensions found:', Object.keys(win.injectedWeb3))
    }
    
    return extensions
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Wallet Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <strong>Wallet Connected:</strong> {wallet.connected ? "Yes" : "No"}
        </div>
        <div>
          <strong>Public Key:</strong> {wallet.publicKey?.toBase58() || "None"}
        </div>
        <div>
          <strong>Wallet Name:</strong> {wallet.wallet?.adapter?.name || "None"}
        </div>
        <div>
          <strong>Connecting:</strong> {wallet.connecting ? "Yes" : "No"}
        </div>
        <div>
          <strong>Clients Loading:</strong> {isLoading ? "Yes" : "No"}
        </div>
        <div>
          <strong>Simple Client:</strong> {client ? "Ready" : "Not Ready"}
        </div>
        <div>
          <strong>Hub Client:</strong> {hubClient ? "Ready" : "Not Ready"}
        </div>
        <div>
          <strong>Full Client:</strong> {fullClient ? "Ready" : "Not Ready"}
        </div>
        <div>
          <strong>Provider Client:</strong> {providerClient ? "Ready" : "Not Ready"}
        </div>
        <div>
          <strong>Available Wallets:</strong> {wallet.wallets.map(w => w.adapter.name).join(", ")}
        </div>
        <div>
          <strong>Window Extensions:</strong>
          <ul className="ml-4 text-xs">
            <li>window.solana: {typeof window !== 'undefined' && (window as any).solana ? 'Present' : 'Not found'}</li>
            <li>window.phantom: {typeof window !== 'undefined' && (window as any).phantom ? 'Present' : 'Not found'}</li>
            <li>window.solflare: {typeof window !== 'undefined' && (window as any).solflare ? 'Present' : 'Not found'}</li>
          </ul>
        </div>
        {error && (
          <div className="text-red-500">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div className="pt-4 space-y-2">
          <button 
            onClick={testDirectConnection}
            className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🧪 Test Direct Phantom Connection
          </button>
          <button 
            onClick={checkBrowserExtensions}
            className="w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            🔍 Check Browser Extensions
          </button>
        </div>
      </CardContent>
    </Card>
  )
}