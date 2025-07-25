# Using MCP Playwright Server with Phantom Wallet

## Overview

The MCP (Model Context Protocol) Playwright server provides programmatic browser control that can be used to test Phantom wallet interactions. However, there are some limitations and workarounds needed.

## Key Challenges

1. **Browser Extensions**: The MCP Playwright server typically runs in an isolated browser instance that doesn't have extensions pre-installed
2. **Persistent Profiles**: Need to use a browser profile that has Phantom already installed
3. **Multiple Windows**: Phantom opens in a separate popup window that needs to be handled

## Solutions

### Option 1: Use Mock Wallet for MCP Testing

Since MCP Playwright runs in an isolated environment, the easiest approach is to inject a mock wallet:

```typescript
// Use MCP to inject mock wallet
await mcp.browser_evaluate({
  function: `() => {
    window.solana = {
      isPhantom: true,
      publicKey: {
        toString: () => 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
      },
      connect: async () => ({ publicKey: window.solana.publicKey }),
      disconnect: async () => {},
      signTransaction: async (tx) => tx,
      isConnected: true
    }
  }`
})
```

### Option 2: Pre-configured Browser Profile

1. Manually set up a Chrome profile with Phantom installed
2. Configure MCP to use that profile (if supported by your MCP server)
3. Use the profile path in browser launch arguments

### Option 3: Use Regular Playwright with MCP Coordination

Use standard Playwright for browser control with Phantom, and use MCP for:
- Test orchestration
- Result analysis  
- Screenshot comparison
- Accessibility testing

## MCP Commands for Wallet Testing

### Navigate to App
```typescript
mcp.browser_navigate({ url: "http://localhost:3000" })
```

### Take Screenshots
```typescript
mcp.browser_take_screenshot({ 
  filename: "wallet-modal.png",
  element: "Wallet selection modal",
  ref: ".wallet-adapter-modal-wrapper"
})
```

### Click Wallet Button
```typescript
mcp.browser_click({
  element: "Select Wallet button",
  ref: "button:has-text('Select Wallet')"
})
```

### Check Wallet State
```typescript
mcp.browser_evaluate({
  function: "() => window.solana && window.solana.isConnected"
})
```

### Wait for Elements
```typescript
mcp.browser_wait_for({
  text: "Select Your Role"
})
```

### Get Page Snapshot
```typescript
mcp.browser_snapshot()
// Returns accessibility tree useful for understanding page structure
```

## Example Test Flow

```typescript
// 1. Navigate to app
await mcp.browser_navigate({ url: "http://localhost:3000" })

// 2. Inject mock wallet
await mcp.browser_evaluate({
  function: mockWalletScript
})

// 3. Click connect wallet
await mcp.browser_click({
  element: "Select Wallet button",
  ref: "button:has-text('Select Wallet')"
})

// 4. Select Phantom
await mcp.browser_click({
  element: "Phantom wallet option", 
  ref: "button:has-text('Phantom')"
})

// 5. Wait for connection
await mcp.browser_wait_for({
  text: "Select Your Role"
})

// 6. Select role
await mcp.browser_click({
  element: "Provider role button",
  ref: "button:has-text('Provider')"
})

// 7. Verify navigation
await mcp.browser_snapshot()
// Check that we're on the provider dashboard
```

## Best Practices

1. **Use Mock Wallets**: For most tests, a mock wallet is sufficient and more reliable
2. **Test UI Flows**: Focus on testing your app's UI rather than Phantom's internals
3. **Screenshot Verification**: Use MCP's screenshot capabilities to verify UI states
4. **Accessibility Testing**: Use browser_snapshot to ensure wallet UI is accessible
5. **Separate Integration Tests**: Keep Phantom-specific tests separate from unit tests

## Limitations

- MCP Playwright server runs in isolation, making real extension testing difficult
- Browser profiles with extensions need to be pre-configured
- Popup windows from extensions may not be easily accessible
- Some wallet operations require user interaction that can't be automated

## Recommended Approach

For testing FairCredit with MCP:

1. Use mock wallet injection for most tests
2. Test the UI flows and role selection
3. Verify proper error handling when wallet is not connected
4. Use screenshots to document the user flow
5. Keep integration tests with real Phantom separate from MCP tests