import { test, expect } from '@playwright/test'
import { injectMockWallet } from './utils/mock-wallet'

// Tests that use the mock wallet for simulating Phantom
test.describe('Wallet Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock wallet before navigating
    await injectMockWallet(page)
    await page.goto('/')
  })

  test('should connect to mock Phantom wallet', async ({ page }) => {
    // Click Select Wallet
    await page.locator('button:has-text("Select Wallet")').click()
    
    // Wait for wallet modal
    await expect(page.locator('.wallet-adapter-modal-wrapper')).toBeVisible()
    
    // Click Phantom option
    await page.locator('button:has-text("Phantom")').click()
    
    // Wait for connection
    await page.waitForTimeout(1000)
    
    // Check that wallet is connected (abbreviated address should show)
    await expect(page.locator('button:has-text("HN7c...YWrH")').first()).toBeVisible()
    
    // Role selection should appear
    await expect(page.locator('h2:has-text("Select Your Role")')).toBeVisible()
  })

  test('should navigate to provider dashboard after role selection', async ({ page }) => {
    // Connect wallet
    await page.locator('button:has-text("Select Wallet")').click()
    await page.locator('button:has-text("Phantom")').click()
    await page.waitForTimeout(1000)
    
    // Select Provider role
    await page.locator('button:has-text("Provider")').click()
    
    // Should navigate to provider dashboard
    await page.waitForURL('**/providers')
    await expect(page).toHaveURL(/\/providers/)
    
    // Dashboard should be visible
    await expect(page.locator('h1:has-text("Provider Dashboard")')).toBeVisible()
  })

  test('should navigate to student dashboard after role selection', async ({ page }) => {
    // Connect wallet
    await page.locator('button:has-text("Select Wallet")').click()
    await page.locator('button:has-text("Phantom")').click()
    await page.waitForTimeout(1000)
    
    // Select Student role
    await page.locator('button:has-text("Student")').click()
    
    // Should navigate to student dashboard
    await page.waitForURL('**/students')
    await expect(page).toHaveURL(/\/students/)
    
    // Dashboard should be visible
    await expect(page.locator('h1:has-text("Student Dashboard")')).toBeVisible()
  })

  test('should show Hub link for verifier role', async ({ page }) => {
    // Connect wallet
    await page.locator('button:has-text("Select Wallet")').click()
    await page.locator('button:has-text("Phantom")').click()
    await page.waitForTimeout(1000)
    
    // Select Verifier role
    await page.locator('button:has-text("Verifier")').click()
    
    // Hub link should be visible
    await expect(page.locator('a[href="/hub"]')).toBeVisible()
    
    // Click Hub link
    await page.locator('a[href="/hub"]').click()
    
    // Should navigate to hub
    await page.waitForURL('**/hub')
    await expect(page.locator('h1:has-text("FairCredit Hub Administration")')).toBeVisible()
  })

  test('should disconnect wallet', async ({ page }) => {
    // Connect wallet first
    await page.locator('button:has-text("Select Wallet")').click()
    await page.locator('button:has-text("Phantom")').click()
    await page.waitForTimeout(1000)
    
    // Select a role
    await page.locator('button:has-text("Student")').click()
    
    // Open user menu
    await page.locator('button[aria-label="User menu"]').click()
    
    // Click disconnect
    await page.locator('text="Disconnect"').click()
    
    // Should show Select Wallet button again
    await expect(page.locator('button:has-text("Select Wallet")')).toBeVisible()
  })

  test('should remember role selection on reload', async ({ page }) => {
    // Connect and select role
    await page.locator('button:has-text("Select Wallet")').click()
    await page.locator('button:has-text("Phantom")').click()
    await page.waitForTimeout(1000)
    await page.locator('button:has-text("Provider")').click()
    
    // Reload page
    await page.reload()
    
    // Should still be on provider dashboard
    await expect(page).toHaveURL(/\/providers/)
    
    // Role should be persisted
    const userType = await page.evaluate(() => localStorage.getItem('userType'))
    expect(userType).toBe('provider')
  })
})