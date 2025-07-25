/**
 * Mock Wallet Adapter for Playwright Testing
 * 
 * This creates a mock wallet that can be injected into the page
 * for testing wallet interactions without requiring Phantom extension
 */

export const mockWalletScript = `
  // Create a mock Solana wallet object
  window.solana = {
    isPhantom: true,
    publicKey: {
      toString: () => 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      toBase58: () => 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      toBuffer: () => new Uint8Array(32),
      equals: () => true
    },
    isConnected: false,
    
    connect: async () => {
      window.solana.isConnected = true
      // Dispatch event that wallet adapters listen for
      window.dispatchEvent(new Event('wallet-connect'))
      return { publicKey: window.solana.publicKey }
    },
    
    disconnect: async () => {
      window.solana.isConnected = false
      window.dispatchEvent(new Event('wallet-disconnect'))
    },
    
    signTransaction: async (transaction) => {
      console.log('Mock signing transaction:', transaction)
      return transaction
    },
    
    signAllTransactions: async (transactions) => {
      console.log('Mock signing transactions:', transactions)
      return transactions
    },
    
    signMessage: async (message) => {
      console.log('Mock signing message:', message)
      return { signature: new Uint8Array(64) }
    },
    
    request: async (params) => {
      console.log('Mock wallet request:', params)
      if (params.method === 'connect') {
        return window.solana.connect()
      }
      return null
    }
  }
  
  // Trigger wallet adapter detection
  setTimeout(() => {
    window.dispatchEvent(new Event('wallet-ready'))
  }, 100)
`

export async function injectMockWallet(page: any) {
  await page.addInitScript(mockWalletScript)
}

export async function connectMockWallet(page: any) {
  await page.evaluate(() => {
    if ((window as any).solana) {
      return (window as any).solana.connect()
    }
  })
}