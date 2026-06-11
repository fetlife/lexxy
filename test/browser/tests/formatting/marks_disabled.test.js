import { test } from "../../test_helper.js"
import { expect } from "@playwright/test"
import { assertEditorHtml } from "../../helpers/assertions.js"
import { startMonitoringConsole } from "../../helpers/assertions.js"

const HELLO_EVERYONE = "<p>Hello everyone</p>"

// Dispatch an inline-format command the same way the toolbar does, so the test
// exercises the FORMAT_TEXT_COMMAND path (toolbar + native Cmd+B/I/U funnel here).
async function dispatchFormat(editor, command) {
  await editor.locator.evaluate((el, cmd) => {
    el.editor.update(() => el.editor.dispatchCommand(cmd))
  }, command)
  await editor.flush()
}

// Simulate pasting content copied from another Lexical/Lexxy editor: the clipboard
// carries `application/x-lexical-editor` (serialized nodes with format bitfields)
// which Lexical deserializes directly, bypassing HTML import conversions.
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

function textNode(text, format) {
  return { type: "text", version: 1, text, format, style: "", mode: "normal", detail: 0 }
}

test.describe("Configurable marks", () => {
  test.describe("default (all marks enabled)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/")
      await page.waitForSelector("lexxy-editor[connected]")
      await page.waitForSelector("lexxy-toolbar[connected]")
    })

    test("every mark button is visible", async ({ page }) => {
      for (const name of [ "bold", "italic", "strikethrough", "underline" ]) {
        await expect(page.locator(`lexxy-toolbar button[name='${name}']`)).toBeVisible()
      }
    })

    test("all four marks still apply", async ({ editor }) => {
      await editor.setValue(HELLO_EVERYONE)
      await editor.select("everyone")
      await dispatchFormat(editor, "bold")
      await assertEditorHtml(editor, "<p>Hello <strong>everyone</strong></p>")

      await editor.setValue(HELLO_EVERYONE)
      await editor.select("everyone")
      await dispatchFormat(editor, "underline")
      await assertEditorHtml(editor, "<p>Hello <u>everyone</u></p>")
    })

    test("disabled marks list is empty", async ({ page }) => {
      await expect(page.locator("lexxy-toolbar")).toHaveAttribute("data-disabled-marks", "")
    })

    test("enabledMarks and disabledMarks return frozen arrays", async ({ editor }) => {
      // The default editor's enabledMarks returns the shared MARK_TYPES constant; it (and the
      // filtered disabledMarks) must be frozen so a host can't mutate shared state.
      const frozen = await editor.locator.evaluate((el) => ({
        enabled: Object.isFrozen(el.enabledMarks),
        disabled: Object.isFrozen(el.disabledMarks),
      }))
      expect(frozen).toEqual({ enabled: true, disabled: true })
    })
  })

  test.describe("marks=['bold','italic'] (strikethrough + underline disabled)", () => {
    test.beforeEach(async ({ page, editor }) => {
      await page.goto("/marks-limited.html")
      await editor.waitForConnected()
      await page.waitForSelector("lexxy-toolbar[connected]")
    })

    test("enabled mark buttons stay visible, disabled ones are hidden", async ({ page }) => {
      await expect(page.locator("lexxy-toolbar button[name='bold']")).toBeVisible()
      await expect(page.locator("lexxy-toolbar button[name='italic']")).toBeVisible()
      await expect(page.locator("lexxy-toolbar button[name='strikethrough']")).toBeHidden()
      await expect(page.locator("lexxy-toolbar button[name='underline']")).toBeHidden()
    })

    test("enabled marks still apply", async ({ editor }) => {
      await editor.setValue(HELLO_EVERYONE)
      await editor.select("everyone")
      await dispatchFormat(editor, "bold")
      await assertEditorHtml(editor, "<p>Hello <strong>everyone</strong></p>")

      await editor.setValue(HELLO_EVERYONE)
      await editor.select("everyone")
      await dispatchFormat(editor, "italic")
      await assertEditorHtml(editor, "<p>Hello <em>everyone</em></p>")
    })

    test("dispatching a disabled mark does nothing", async ({ editor }) => {
      await editor.setValue(HELLO_EVERYONE)
      await editor.select("everyone")
      await dispatchFormat(editor, "strikethrough")
      await assertEditorHtml(editor, HELLO_EVERYONE)
    })

    test("the underline command is inert even though it has no button", async ({ editor }) => {
      await editor.setValue(HELLO_EVERYONE)
      await editor.select("everyone")
      await dispatchFormat(editor, "underline")
      await assertEditorHtml(editor, HELLO_EVERYONE)
    })

    test("the markdown shortcut for a disabled mark stays literal", async ({ editor }) => {
      await editor.send("hello")
      await editor.send("~~")
      await editor.send("Home")
      await editor.send("~~")
      await assertEditorHtml(editor, "<p>~~hello~~</p>")
    })

    test("disabled marks are stripped on import while enabled marks survive", async ({ editor }) => {
      await editor.setValue("<p><strong>keep</strong> <s>strike</s> <u>under</u></p>")
      await assertEditorHtml(editor, "<p><strong>keep</strong> strike under</p>")
    })

    test("pasting Lexical clipboard data does not re-introduce a disabled mark", async ({ editor }) => {
      await editor.send("before ")
      // format 4 = strikethrough bit; pasted as a serialized Lexical node, not HTML, so it
      // bypasses the import conversions and the FORMAT_TEXT_COMMAND interceptor.
      await pasteLexicalNodes(editor, [ textNode("struck", 4) ])

      // The mark must not render in the live editor (the sanitizer already strips it from value()).
      await expect
        .poll(async () => {
          await editor.flush()
          return await editor.innerHTML()
        }, { timeout: 5_000 })
        .not.toContain("lexxy-content__strikethrough")
      expect(await editor.value()).toContain("struck")
    })
  })

  test.describe("marks as a whitespace-separated string", () => {
    test.beforeEach(async ({ page, editor }) => {
      await page.goto("/marks-string.html")
      await editor.waitForConnected()
      await page.waitForSelector("lexxy-toolbar[connected]")
    })

    test("marks=\"bold italic\" enables exactly bold + italic", async ({ page, editor }) => {
      await expect(page.locator("lexxy-toolbar button[name='bold']")).toBeVisible()
      await expect(page.locator("lexxy-toolbar button[name='italic']")).toBeVisible()
      await expect(page.locator("lexxy-toolbar button[name='strikethrough']")).toBeHidden()
      await expect(page.locator("lexxy-toolbar button[name='underline']")).toBeHidden()

      await editor.setValue(HELLO_EVERYONE)
      await editor.select("everyone")
      await dispatchFormat(editor, "italic")
      await assertEditorHtml(editor, "<p>Hello <em>everyone</em></p>")
    })
  })

  // A non-list value (boolean, empty/bare attribute) is not a valid allow-list and must
  // fall back to all marks enabled — never silently disable everything.
  for (const fixture of [ "marks-true.html", "marks-empty.html" ]) {
    test.describe(`${fixture} (non-list value falls back to all enabled)`, () => {
      test.beforeEach(async ({ page, editor }) => {
        await page.goto(`/${fixture}`)
        await editor.waitForConnected()
        await page.waitForSelector("lexxy-toolbar[connected]")
      })

      test("every mark button is visible", async ({ page }) => {
        for (const name of [ "bold", "italic", "strikethrough", "underline" ]) {
          await expect(page.locator(`lexxy-toolbar button[name='${name}']`)).toBeVisible()
        }
        await expect(page.locator("lexxy-toolbar")).toHaveAttribute("data-disabled-marks", "")
      })

      test("a mark still applies", async ({ editor }) => {
        await editor.setValue(HELLO_EVERYONE)
        await editor.select("everyone")
        await dispatchFormat(editor, "strikethrough")
        await assertEditorHtml(editor, "<p>Hello <s>everyone</s></p>")
      })
    })
  }

  test.describe("marks=[] (all marks disabled)", () => {
    test.beforeEach(async ({ page, editor }) => {
      await page.goto("/marks-none.html")
      await editor.waitForConnected()
      await page.waitForSelector("lexxy-toolbar[connected]")
    })

    test("no mark buttons are visible but the toolbar still renders", async ({ page }) => {
      for (const name of [ "bold", "italic", "strikethrough", "underline" ]) {
        await expect(page.locator(`lexxy-toolbar button[name='${name}']`)).toBeHidden()
      }
      await expect(page.locator("lexxy-toolbar button[name='quote']")).toBeVisible()
    })

    test("every mark command is inert", async ({ editor }) => {
      for (const command of [ "bold", "italic", "strikethrough", "underline" ]) {
        await editor.setValue(HELLO_EVERYONE)
        await editor.select("everyone")
        await dispatchFormat(editor, command)
        await assertEditorHtml(editor, HELLO_EVERYONE)
      }
    })

    test("every mark markdown shortcut stays literal", async ({ editor }) => {
      await editor.send("hello")
      await editor.send("**")
      await editor.send("Home")
      await editor.send("**")
      await assertEditorHtml(editor, "<p>**hello**</p>")
    })

    test("the combined bold-italic markdown shortcut stays literal", async ({ editor }) => {
      await editor.send("hello")
      await editor.send("***")
      await editor.send("Home")
      await editor.send("***")
      await assertEditorHtml(editor, "<p>***hello***</p>")
    })

    test("all mark tags are stripped on import", async ({ editor }) => {
      await editor.setValue("<p><strong>a</strong><em>b</em><s>c</s><u>d</u></p>")
      await assertEditorHtml(editor, "<p>abcd</p>")
    })

    test("the editor connects without console errors", async ({ page, editor }) => {
      // Monitor before navigating so connect-time errors (e.g. from the disabled-mark
      // setup) are captured — the beforeEach navigation already happened before this body.
      startMonitoringConsole(page)
      await page.goto("/marks-none.html")
      await editor.waitForConnected()
      await editor.setValue("<p>Hello everyone</p>")
      await editor.flush()
      expect(page).toHaveNoErrors()
    })
  })
})
