import { test } from "../../test_helper.js"
import { expect } from "@playwright/test"
import { startMonitoringConsole } from "../../helpers/assertions.js"

// Code blocks render as <code> in the editor's live DOM; the canonical contract
// is the exported value() (blocks -> <pre data-language>, inline code -> <code>).
const valueOf = async (editor) => {
  await editor.flush()
  return editor.value()
}

test.describe("Code disabled", () => {
  test("Code toolbar button is present by default (regression baseline)", async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector("lexxy-toolbar[connected]")

    await expect(page.locator("lexxy-toolbar button[name='code']")).toBeVisible()
  })

  test("Code toolbar button is absent when code is disabled", async ({ page }) => {
    await page.goto("/code-disabled.html")
    await page.waitForSelector("lexxy-editor[connected]")
    await page.waitForSelector("lexxy-toolbar[connected]")

    await expect(page.locator("lexxy-toolbar button[name='code']")).toHaveCount(0)
  })

  test("markdown code fence does not create a code block when code is disabled", async ({ page, editor }) => {
    await page.goto("/code-disabled.html")
    await editor.waitForConnected()

    await editor.click()
    await editor.send("```")
    await editor.send("Enter")
    await editor.send("x")

    await expect.poll(() => valueOf(editor)).not.toContain("<pre")
  })

  test("inline-code markdown does not apply code format when code is disabled", async ({ page, editor }) => {
    await page.goto("/code-disabled.html")
    await editor.waitForConnected()

    await editor.click()
    await editor.send("`code`")

    await expect.poll(() => valueOf(editor)).not.toContain("<code")
  })

  test("loading a code block strips it to plain text when code is disabled", async ({ page, editor }) => {
    await page.goto("/code-disabled.html")
    await editor.waitForConnected()

    await editor.setValue('<pre data-language="ruby"><code>def hi</code></pre>')

    // Neither the block (<pre>) nor the inner inline <code> should survive.
    await expect.poll(() => valueOf(editor)).not.toContain("<pre")
    await expect.poll(() => valueOf(editor)).not.toContain("<code")
    await expect.poll(() => valueOf(editor)).toContain("def hi")
  })

  test("editor connects without crashing when code is disabled", async ({ page }) => {
    startMonitoringConsole(page)

    await page.goto("/code-disabled.html")
    await page.waitForSelector("lexxy-editor[connected]")

    expect(page).toHaveNoErrors()
  })
})
