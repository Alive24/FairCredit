import { 
  PublicKey, 
  Transaction, 
  Connection,
  Keypair,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { WalletReadyState, WalletName } from "@solana/wallet-adapter-base";

// Real dev wallet that can sign and send actual transactions
export class RealDevWalletAdapter {
  name = 'Dev Wallet (Real Transactions)' as WalletName<'Dev Wallet (Real Transactions)'>
  url = 'https://localhost:3000'
  icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3VjE3QzIgMTkuMjEgMy43OSAyMSA2IDIxSDE4QzIwLjIxIDIxIDIyIDE5LjIxIDIyIDE3VjdMMTIgMloiIHN0cm9rZT0iIzAwRkY4OCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTEyIDExVjE2IiBzdHJva2U9IiMwMEZGODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPg=='
  readyState = WalletReadyState.Installed
  connecting = false
  connected = false
  autoConnect = async (): Promise<void> => {}
  publicKey: PublicKey | null = null
  supportedTransactionVersions: ReadonlySet<0 | 'legacy'> = new Set(['legacy', 0] as const)

  private keypair: Keypair | null = null;

  constructor() {
    // Try to load keypair from environment or localStorage
    this.loadKeypair();
    
    // Check if already connected
    if (typeof window !== 'undefined' && localStorage.getItem('realDevWalletConnected') === 'true' && this.keypair) {
      this.connected = true
      this.publicKey = this.keypair.publicKey
    }
  }

  private loadKeypair() {
    try {
      // First, check if we have a keypair in localStorage (for persistence)
      if (typeof window !== 'undefined') {
        const storedSecret = localStorage.getItem('devWalletSecret');
        if (storedSecret) {
          const secretKey = new Uint8Array(JSON.parse(storedSecret));
          this.keypair = Keypair.fromSecretKey(secretKey);
          return;
        }
      }

      // If not, try to load from environment variable
      const secretKeyBase64 = process.env.NEXT_PUBLIC_TEST_AUTHORITY_SECRET_KEY;
      if (secretKeyBase64) {
        const secretKey = Buffer.from(secretKeyBase64, 'base64');
        this.keypair = Keypair.fromSecretKey(secretKey);
        
        // Store in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('devWalletSecret', JSON.stringify(Array.from(this.keypair.secretKey)));
        }
      }
    } catch (error) {
      console.error('Failed to load dev wallet keypair:', error);
    }
  }

  async connect(): Promise<void> {
    if (!this.keypair) {
      throw new Error('No keypair available. Please set NEXT_PUBLIC_TEST_AUTHORITY_SECRET_KEY environment variable.');
    }

    this.connecting = true
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    this.connected = true
    this.publicKey = this.keypair.publicKey
    this.connecting = false
    
    // Save connection state
    if (typeof window !== 'undefined') {
      localStorage.setItem('realDevWalletConnected', 'true')
    }
    
    console.log('Connected with dev wallet:', this.publicKey.toBase58());
    this.emit('connect', this.publicKey)
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.publicKey = null
    
    // Clear connection state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('realDevWalletConnected')
    }
    
    this.emit('disconnect')
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.connected || !this.keypair) throw new Error('Wallet not connected')
    
    transaction.sign(this.keypair)
    return transaction
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    if (!this.connected || !this.keypair) throw new Error('Wallet not connected')
    
    return transactions.map(tx => {
      tx.sign(this.keypair!)
      return tx
    })
  }

  async signMessage(_message: Uint8Array): Promise<Uint8Array> {
    if (!this.connected || !this.keypair) throw new Error('Wallet not connected')
    
    // For now, return a mock signature
    // In production, you would use nacl.sign.detached
    return new Uint8Array(64)
  }

  async sendTransaction(
    transaction: Transaction,
    connection: Connection,
    options?: any
  ): Promise<string> {
    if (!this.connected || !this.keypair) throw new Error('Wallet not connected')
    
    try {
      console.log('Sending real transaction...');
      
      // Sign the transaction
      transaction.sign(this.keypair)
      
      // Send the raw transaction
      const rawTransaction = transaction.serialize()
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        ...options
      })
      
      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash()
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed')
      
      console.log('Transaction confirmed:', signature)
      return signature
    } catch (error) {
      console.error('Error sending transaction:', error)
      throw error
    }
  }

  // Method to import a keypair (useful for testing)
  async importKeypair(secretKey: Uint8Array | string) {
    try {
      let keypair: Keypair;
      
      if (typeof secretKey === 'string') {
        // Assume it's base64 encoded
        const secretKeyBytes = Buffer.from(secretKey, 'base64');
        keypair = Keypair.fromSecretKey(secretKeyBytes);
      } else {
        keypair = Keypair.fromSecretKey(secretKey);
      }
      
      this.keypair = keypair;
      
      // Store in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('devWalletSecret', JSON.stringify(Array.from(keypair.secretKey)));
      }
      
      console.log('Imported keypair with public key:', keypair.publicKey.toBase58());
      
      // If already connected, update the public key
      if (this.connected) {
        this.publicKey = keypair.publicKey;
        this.emit('change', { publicKey: this.publicKey });
      }
    } catch (error) {
      console.error('Failed to import keypair:', error);
      throw error;
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