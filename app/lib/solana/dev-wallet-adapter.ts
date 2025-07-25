import { 
  PublicKey, 
  Transaction, 
  Connection,
  Keypair,
  sendAndConfirmTransaction 
} from "@solana/web3.js";
import { WalletAdapter } from "@solana/wallet-adapter-base";

// Hub authority keypair from deployment
// In production, NEVER expose private keys like this!
const HUB_AUTHORITY_SECRET = [
  186, 27, 252, 181, 174, 242, 86, 128, 82, 235, 232, 172, 76, 31, 34, 150,
  12, 224, 235, 213, 196, 200, 37, 55, 192, 49, 220, 33, 245, 168, 22, 236,
  243, 125, 80, 203, 88, 169, 194, 149, 130, 62, 199, 233, 99, 193, 209, 36,
  195, 110, 215, 140, 172, 6, 195, 78, 140, 227, 39, 175, 74, 211, 198, 51
];

const hubAuthorityKeypair = Keypair.fromSecretKey(new Uint8Array(HUB_AUTHORITY_SECRET));

// Dev wallet adapter that can actually sign transactions
export class DevWalletAdapter implements WalletAdapter {
  name = 'Dev Wallet (Hub Authority)' as const
  url = 'https://localhost:3000'
  icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3VjE3QzIgMTkuMjEgMy43OSAyMSA2IDIxSDE4QzIwLjIxIDIxIDIyIDE5LjIxIDIyIDE3VjdMMTIgMloiIHN0cm9rZT0iI0ZGNjYwMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTEyIDExVjE2IiBzdHJva2U9IiNGRjY2MDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPg=='
  readyState = 'Installed' as const
  connecting = false
  connected = false
  publicKey: PublicKey | null = null

  private keypair: Keypair = hubAuthorityKeypair;

  constructor() {
    // Check if already connected
    if (typeof window !== 'undefined' && localStorage.getItem('devWalletConnected') === 'true') {
      this.connected = true
      this.publicKey = this.keypair.publicKey
    }
  }

  async connect(): Promise<void> {
    this.connecting = true
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    this.connected = true
    this.publicKey = this.keypair.publicKey
    this.connecting = false
    
    // Save connection state
    if (typeof window !== 'undefined') {
      localStorage.setItem('devWalletConnected', 'true')
    }
    
    this.emit('connect', this.publicKey)
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.publicKey = null
    
    // Clear connection state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('devWalletConnected')
    }
    
    this.emit('disconnect')
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.connected) throw new Error('Wallet not connected')
    
    // Actually sign the transaction
    transaction.sign(this.keypair)
    return transaction
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    if (!this.connected) throw new Error('Wallet not connected')
    
    return transactions.map(tx => {
      tx.sign(this.keypair)
      return tx
    })
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected) throw new Error('Wallet not connected')
    
    // For now, return a mock signature
    // In production, you would use nacl.sign.detached
    return new Uint8Array(64)
  }

  async sendTransaction(
    transaction: Transaction,
    connection: Connection,
    options?: any
  ): Promise<string> {
    if (!this.connected) throw new Error('Wallet not connected')
    
    try {
      // Sign the transaction
      transaction.sign(this.keypair)
      
      // Send the transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [this.keypair],
        {
          commitment: 'confirmed',
          ...options
        }
      )
      
      console.log('Transaction sent:', signature)
      return signature
    } catch (error) {
      console.error('Error sending transaction:', error)
      throw error
    }
  }

  // Event emitter methods
  private listeners: { [key: string]: Array<(...args: any[]) => void> } = {}

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(listener)
  }

  off(event: string, listener: (...args: any[]) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener)
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args))
    }
  }
}