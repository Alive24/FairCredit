"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useFairCredit } from "@/lib/solana/context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function WalletDebug() {
  const wallet = useWallet()
  const { client, providerClient, hubClient, verifierClient, mentorClient, isLoading, error } = useFairCredit()
  const [hasMounted, setHasMounted] = useState(false)
  const [availableWalletNames, setAvailableWalletNames] = useState<string[]>([])
  const [extensionStatus, setExtensionStatus] = useState<{
    solana: boolean
    phantom: boolean
    solflare: boolean
  } | null>(null)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) return
    setAvailableWalletNames(wallet.wallets.map((w) => w.adapter.name))
  }, [hasMounted, wallet.wallets])

  useEffect(() => {
    if (!hasMounted) return
    const win = window as any
    setExtensionStatus({
      solana: !!win.solana,
      phantom: !!win.phantom,
      solflare: !!win.solflare,
    })
  }, [hasMounted])

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
    setExtensionStatus({
      solana: extensions.solana,
      phantom: extensions.phantom,
      solflare: extensions.solflare,
    })
    
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
          <strong>Wallet Connected:</strong> {hasMounted ? (wallet.connected ? "Yes" : "No") : "Detecting..."}
        </div>
        <div>
          <strong>Public Key:</strong> {hasMounted ? wallet.publicKey?.toBase58() || "None" : "Detecting..."}
        </div>
        <div>
          <strong>Wallet Name:</strong> {hasMounted ? wallet.wallet?.adapter?.name || "None" : "Detecting..."}
        </div>
        <div>
          <strong>Connecting:</strong> {hasMounted ? (wallet.connecting ? "Yes" : "No") : "Detecting..."}
        </div>
        <div>
          <strong>Clients Loading:</strong> {hasMounted ? (isLoading ? "Yes" : "No") : "Detecting..."}
        </div>
        <div>
          <strong>Readonly Client:</strong> {hasMounted ? (client ? "Ready" : "Not Ready") : "Detecting..."}
        </div>
        <div>
          <strong>Provider Client:</strong> {hasMounted ? (providerClient ? "Ready" : "Not Ready") : "Detecting..."}
        </div>
        <div>
          <strong>Hub Client:</strong> {hasMounted ? (hubClient ? "Ready" : "Not Ready") : "Detecting..."}
        </div>
        <div>
          <strong>Verifier Client:</strong> {hasMounted ? (verifierClient ? "Ready" : "Not Ready") : "Detecting..."}
        </div>
        <div>
          <strong>Mentor Client:</strong> {hasMounted ? (mentorClient ? "Ready" : "Not Ready") : "Detecting..."}
        </div>
        <div>
          <strong>Available Wallets:</strong>{" "}
          {hasMounted
            ? (availableWalletNames.length ? availableWalletNames.join(", ") : "None")
            : "Detecting..."}
        </div>
        <div>
          <strong>Window Extensions:</strong>
          <ul className="ml-4 text-xs">
            <li>
              window.solana:{" "}
              {hasMounted
                ? extensionStatus?.solana
                  ? "Present"
                  : "Not found"
                : "Detecting..."}
            </li>
            <li>
              window.phantom:{" "}
              {hasMounted
                ? extensionStatus?.phantom
                  ? "Present"
                  : "Not found"
                : "Detecting..."}
            </li>
            <li>
              window.solflare:{" "}
              {hasMounted
                ? extensionStatus?.solflare
                  ? "Present"
                  : "Not found"
                : "Detecting..."}
            </li>
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
