import { test } from "../../test_helper.js"
import { EditorHandle } from "../../helpers/editor_handle.js"
import { expect } from "@playwright/test"

test.describe("Prompt popover inside a clipping container", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 })
    await page.goto("/prompt-overflow-container.html")
  })

  test("flips above the cursor when the menu overflows a scroll container the window still has room below", async ({ page }) => {
    const editor = new EditorHandle(page, "lexxy-editor")
    await editor.waitForConnected()

    await editor.send("@")

    const popover = page.locator(".lexxy-prompt-menu--visible")
    await expect(popover).toBeVisible({ timeout: 5_000 })
    await expect(popover).toHaveAttribute("data-clipped-at-bottom", "")

    const positions = await page.evaluate(() => {
      const container = document.querySelector(".scroll-container")
      const popover = document.querySelector(".lexxy-prompt-menu--visible")

      return {
        containerBottom: container.getBoundingClientRect().bottom,
        popoverBottom: popover.getBoundingClientRect().bottom,
        viewportBottom: window.innerHeight,
      }
    })

    expect(positions.popoverBottom).toBeLessThanOrEqual(positions.containerBottom + 1)
    expect(positions.popoverBottom).toBeLessThan(positions.viewportBottom)
  })

  test("drops the upward flip once the container has room below the cursor again", async ({ page }) => {
    const editor = new EditorHandle(page, "lexxy-editor")
    await editor.waitForConnected()

    await editor.send("@")

    const popover = page.locator(".lexxy-prompt-menu--visible")
    await expect(popover).toBeVisible({ timeout: 5_000 })
    await expect(popover).toHaveAttribute("data-clipped-at-bottom", "")

    await page.evaluate(() => {
      document.querySelector(".scroll-container").style.blockSize = "600px"
    })

    await editor.send("a")

    await expect(popover).not.toHaveAttribute("data-clipped-at-bottom", "")
  })
})
