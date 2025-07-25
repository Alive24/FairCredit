import { test, expect } from '@playwright/test'

// This test runs without Phantom extension
// It tests the UI flow without actual wallet connection
test.describe('Wallet Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show wallet selection modal when clicking connect', async ({ page }) => {
    // Click the Select Wallet button
    await page.locator('button:has-text("Select Wallet")').click()
    
    // Check that wallet modal appears
    await expect(page.locator('.wallet-adapter-modal-wrapper')).toBeVisible()
    
    // Check that Phantom option is available
    await expect(page.locator('button:has-text("Phantom")')).toBeVisible()
    
    // Take screenshot of wallet modal
    await page.screenshot({ path: 'tests/screenshots/wallet-modal.png' })
  })

  test('should close wallet modal when clicking backdrop', async ({ page }) => {
    // Open wallet modal
    await page.locator('button:has-text("Select Wallet")').click()
    
    // Click backdrop to close
    await page.locator('.wallet-adapter-modal-wrapper').click({ position: { x: 10, y: 10 } })
    
    // Modal should be hidden
    await expect(page.locator('.wallet-adapter-modal-wrapper')).toBeHidden()
  })

  test('should show role selection after wallet connection (mocked)', async ({ page }) => {
    // For testing without real wallet, we can mock the wallet connection
    // by manipulating the page state
    await page.evaluate(() => {
      // Simulate wallet connection by setting localStorage
      localStorage.setItem('walletConnected', 'true')
      // Trigger a storage event to update the UI
      window.dispatchEvent(new Event('storage'))
    })
    
    // Reload to apply the mock state
    await page.reload()
    
    // Role selection should be visible
    await expect(page.locator('h2:has-text("Select Your Role")')).toBeVisible()
  })

  test('should persist role selection', async ({ page }) => {
    // Mock wallet connection
    await page.evaluate(() => {
      localStorage.setItem('walletConnected', 'true')
    })
    await page.reload()
    
    // Select a role
    await page.locator('button:has-text("Provider")').click()
    
    // Check localStorage
    const userType = await page.evaluate(() => localStorage.getItem('userType'))
    expect(userType).toBe('provider')
    
    // Reload page
    await page.reload()
    
    // Should not show role selection again
    await expect(page.locator('h2:has-text("Select Your Role")')).toBeHidden()
  })

  test('should show Hub link for verified users', async ({ page }) => {
    // Mock wallet connection and verifier role
    await page.evaluate(() => {
      localStorage.setItem('walletConnected', 'true')
      localStorage.setItem('userType', 'verifier')
    })
    await page.reload()
    
    // Hub link should be visible in navigation
    await expect(page.locator('a[href="/hub"]')).toBeVisible()
  })

  test('should allow changing role from dropdown', async ({ page }) => {
    // Mock wallet connection and role
    await page.evaluate(() => {
      localStorage.setItem('walletConnected', 'true')
      localStorage.setItem('userType', 'student')
    })
    await page.reload()
    
    // Open user menu
    await page.locator('button[aria-label="User menu"]').click()
    
    // Click change role
    await page.locator('text="Change Role"').click()
    
    // Role selection should be visible again
    await expect(page.locator('h2:has-text("Select Your Role")')).toBeVisible()
    
    // Select new role
    await page.locator('button:has-text("Provider")').click()
    
    // Check that role was updated
    const newUserType = await page.evaluate(() => localStorage.getItem('userType'))
    expect(newUserType).toBe('provider')
  })
})