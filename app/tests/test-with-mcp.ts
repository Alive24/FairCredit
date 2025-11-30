/**
 * Example of testing FairCredit with MCP Playwright
 * This shows how to use MCP commands to test the wallet flow
 */

// Mock wallet script to inject
const mockWalletScript = `
  window.solana = {
    isPhantom: true,
    publicKey: {
      toString: () => 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      toBase58: () => 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
    },
    isConnected: false,
    connect: async () => {
      window.solana.isConnected = true;
      return { publicKey: window.solana.publicKey };
    },
    disconnect: async () => {
      window.solana.isConnected = false;
    }
  };
`;

// Test commands to run via MCP
type MCPCommand = { tool: string; params: Record<string, unknown> };
type MCPCommandEntry = MCPCommand | MCPCommand[];

export const testCommands: Record<string, MCPCommandEntry> = {
  // 1. Setup and navigate
  setup: [
    { tool: 'browser_navigate', params: { url: 'http://localhost:3000' } },
    { tool: 'browser_wait_for', params: { time: 2 } }
  ],

  // 2. Inject mock wallet
  injectWallet: {
    tool: 'browser_evaluate',
    params: {
      function: `() => { ${mockWalletScript} }`
    }
  },

  // 3. Test wallet connection flow
  connectWallet: [
    // Click Select Wallet
    {
      tool: 'browser_click',
      params: {
        element: 'Select Wallet button',
        ref: 'button:has-text("Select Wallet")'
      }
    },
    // Wait for modal
    {
      tool: 'browser_wait_for',
      params: { text: 'Connect a wallet' }
    },
    // Take screenshot of modal
    {
      tool: 'browser_take_screenshot',
      params: {
        filename: 'wallet-modal.png',
        element: 'Wallet adapter modal',
        ref: '.wallet-adapter-modal-wrapper'
      }
    },
    // Click Phantom
    {
      tool: 'browser_click',
      params: {
        element: 'Phantom wallet option',
        ref: 'button:has-text("Phantom")'
      }
    }
  ],

  // 4. Test role selection
  selectRole: [
    // Wait for role modal
    {
      tool: 'browser_wait_for',
      params: { text: 'Select Your Role' }
    },
    // Take screenshot
    {
      tool: 'browser_take_screenshot',
      params: {
        filename: 'role-selection.png'
      }
    },
    // Get page structure
    {
      tool: 'browser_snapshot',
      params: {}
    },
    // Click Provider role
    {
      tool: 'browser_click',
      params: {
        element: 'Provider role button',
        ref: 'button:has-text("Provider")'
      }
    }
  ],

  // 5. Verify dashboard
  verifyDashboard: [
    // Wait for navigation
    {
      tool: 'browser_wait_for',
      params: { time: 2 }
    },
    // Check URL
    {
      tool: 'browser_evaluate',
      params: {
        function: '() => window.location.pathname'
      }
    },
    // Check dashboard loaded
    {
      tool: 'browser_wait_for',
      params: { text: 'Provider Dashboard' }
    },
    // Final screenshot
    {
      tool: 'browser_take_screenshot',
      params: {
        filename: 'provider-dashboard.png'
      }
    }
  ],

  // 6. Test Hub access for verifier
  testHubAccess: [
    // First disconnect
    {
      tool: 'browser_click',
      params: {
        element: 'User menu button',
        ref: 'button[aria-label="User menu"]'
      }
    },
    {
      tool: 'browser_click',
      params: {
        element: 'Change role option',
        ref: 'text="Change Role"'
      }
    },
    // Select Verifier role
    {
      tool: 'browser_click',
      params: {
        element: 'Verifier role button',
        ref: 'button:has-text("Verifier")'
      }
    },
    // Check Hub link appears
    {
      tool: 'browser_wait_for',
      params: { text: 'Hub' }
    },
    // Click Hub link
    {
      tool: 'browser_click',
      params: {
        element: 'Hub navigation link',
        ref: 'a[href="/hub"]'
      }
    },
    // Verify Hub dashboard
    {
      tool: 'browser_wait_for',
      params: { text: 'FairCredit Hub Administration' }
    }
  ]
};

// Helper to execute test sequence
export async function runMCPTest(
  mcp: Record<string, (params: Record<string, unknown>) => Promise<unknown>>,
  testName: string,
) {
  console.log(`Running test: ${testName}`);
  
  const commands = testCommands[testName];
  const commandArray = Array.isArray(commands) ? commands : [commands];
  
  for (const cmd of commandArray) {
    console.log(`Executing: ${cmd.tool}`);
    await mcp[cmd.tool](cmd.params);
  }
}

// Full test flow
export async function runFullWalletTest(
  mcp: Record<string, (params: Record<string, unknown>) => Promise<unknown>>,
) {
  try {
    // Setup
    await runMCPTest(mcp, 'setup');
    await runMCPTest(mcp, 'injectWallet');
    
    // Test wallet connection
    await runMCPTest(mcp, 'connectWallet');
    
    // Test role selection
    await runMCPTest(mcp, 'selectRole');
    
    // Verify dashboard
    await runMCPTest(mcp, 'verifyDashboard');
    
    // Test Hub access
    await runMCPTest(mcp, 'testHubAccess');
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    
    // Take error screenshot
    await mcp.browser_take_screenshot({
      filename: 'error-state.png'
    });
    
    throw error;
  }
}
