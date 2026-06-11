import { test } from "../../test_helper.js"
import { expect } from "@playwright/test"
import { startMonitoringConsole, assertEditorContent } from "../../helpers/assertions.js"

const COLORED_HTML =
  '<p><mark style="color: var(--highlight-1);">red</mark> and <mark style="background-color: var(--highlight-bg-2);">bg</mark> plain</p>'

const valueOf = async (editor) => {
  await editor.flush()
  return editor.value()
}

// Simulate pasting content copied from another Lexxy editor: the clipboard carries
// `application/x-lexical-editor` (serialized nodes with their inline styles + format
// bitfields) which Lexical deserializes directly, bypassing HTML import conversions.
async function pasteLexicalNodes(editor, nodes) {
  const payload = JSON.stringify({ namespace: "Lexxy", nodes })
  await editor.content.evaluate((el, data) => {
    const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: new DataTransfer() })
    event.clipboardData.setData("application/x-lexical-editor", data)
    event.clipboardData.setData("text/html", "<span>pasted</span>")
    event.clipboardData.setData("text/plain", "pasted")
    el.dispatchEvent(event)
  }, payload)
  await editor.flush()
}

// A serialized text node carrying a highlight color (and the highlight format bit, 1 << 7),
// exactly as a copy from a highlight-enabled editor would produce.
function highlightedTextNode(text, style) {
  return { type: "text", version: 1, text, format: 1 << 7, style, mode: "normal", detail: 0 }
}

test.describe("Highlight disabled", () => {
  test("the highlight dropdown is visible by default (regression baseline)", async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector("lexxy-toolbar[connected]")

    await expect(page.locator("lexxy-toolbar [name='highlight']")).toBeVisible()
  })

  test("the highlight dropdown is hidden when highlight is disabled", async ({ page }) => {
    await page.goto("/highlight-false.html")
    await page.waitForSelector("lexxy-editor[connected]")
    await page.waitForSelector("lexxy-toolbar[connected]")

    await expect(page.locator("lexxy-toolbar [name='highlight']")).toBeHidden()
  })

  test("dispatching toggleHighlight does nothing when highlight is disabled", async ({ page, editor }) => {
    await page.goto("/highlight-false.html")
    await editor.waitForConnected()

    await editor.setValue("<p>Hello everyone</p>")
    await editor.select("everyone")
    await editor.locator.evaluate((el) => el.editor.dispatchCommand("toggleHighlight", { color: "var(--highlight-1)" }))

    await expect.poll(() => valueOf(editor)).not.toContain("<mark")
    await expect.poll(() => valueOf(editor)).not.toContain("var(--highlight")
  })

  test("loading highlighted content strips the highlight when disabled", async ({ page, editor }) => {
    await page.goto("/highlight-false.html")
    await editor.waitForConnected()

    await editor.setValue(COLORED_HTML)

    await expect.poll(() => valueOf(editor)).not.toContain("<mark")
    await expect.poll(() => valueOf(editor)).not.toContain("var(--highlight")
    // text content must be preserved
    const value = await valueOf(editor)
    for (const text of [ "red", "bg", "plain" ]) {
      expect(value).toContain(text)
    }
  })

  test("pasting Lexical clipboard data does not re-introduce highlight colors when disabled", async ({ page, editor }) => {
    await page.goto("/highlight-false.html")
    await editor.waitForConnected()

    await editor.send("before ")
    await pasteLexicalNodes(editor, [ highlightedTextNode("colored", "color: var(--highlight-1);") ])

    await expect.poll(() => valueOf(editor)).not.toContain("var(--highlight")
    await expect.poll(() => valueOf(editor)).not.toContain("color:")
    expect(await valueOf(editor)).toContain("colored")

    // the color must not survive in the live editor DOM either
    await assertEditorContent(editor, async (content) => {
      await expect(content.locator('[style*="color"]')).toHaveCount(0)
    })
  })

  test("editor connects without crashing when highlight is disabled", async ({ page }) => {
    startMonitoringConsole(page)

    await page.goto("/highlight-false.html")
    await page.waitForSelector("lexxy-editor[connected]")

    expect(page).toHaveNoErrors()
  })

  test("legacy Trix styled-element highlights are stripped (formats kept) when disabled", async ({ page, editor }) => {
    await page.goto("/highlight-false.html")
    await editor.waitForConnected()

    await editor.setValue('<p><em style="color: var(--highlight-1);">italic</em> <strong style="background-color: var(--highlight-bg-2);">bold</strong> <del style="color: var(--highlight-3);">struck</del></p>')

    const value = await valueOf(editor)
    expect(value).not.toContain("var(--highlight")
    expect(value).not.toContain("color:")
    for (const text of [ "italic", "bold", "struck" ]) expect(value).toContain(text)

    // the inline marks survive; only the highlight color is stripped
    await assertEditorContent(editor, async (content) => {
      await expect(content.locator('[style*="color"]')).toHaveCount(0)
      await expect(content.locator("em, i")).toHaveText("italic")
      await expect(content.locator("strong, b")).toHaveText("bold")
    })
  })

  test("a bare highlight=\"false\" attribute disables without crashing", async ({ page }) => {
    startMonitoringConsole(page)

    await page.goto("/highlight-false-bare.html")
    await page.waitForSelector("lexxy-editor[connected]")
    await page.waitForSelector("lexxy-toolbar[connected]")

    expect(page).toHaveNoErrors()
    await expect(page.locator("lexxy-toolbar [name='highlight']")).toBeHidden()
  })
})
