import { defineExtension } from "lexical"
import { CodeNode, normalizeCodeLang } from "@lexical/code"
import { extendConversion, extendTextNodeConversion } from "../helpers/lexical_helper"
import { $applyHighlightStyle } from "./highlight_extension"
import LexxyExtension from "./lexxy_extension"

const TRIX_LANGUAGE_ATTR = "language"

export class TrixContentExtension extends LexxyExtension {

  get enabled() {
    return this.editorElement.supportsRichText
  }

  get lexicalExtension() {
    // The em/span/strong/del converters below exist to import legacy Trix highlight
    // colors. When highlight is disabled we drop the color application so those
    // elements fall back to plain formatting (the em/span/strong handlers return null,
    // deferring to Lexical's default bold/italic conversion; del keeps strikethrough).
    const supportsHighlight = this.editorElement.supportsHighlight

    return defineExtension({
      name: "lexxy/trix-content",
      html: {
        import: {
          em: (element) => onlyStyledElements(element, supportsHighlight, {
            conversion: extendTextNodeConversion("i", $applyHighlightStyle),
            priority: 1
          }),
          span: (element) => onlyStyledElements(element, supportsHighlight, {
            conversion: extendTextNodeConversion("mark", $applyHighlightStyle),
            priority: 1
          }),
          strong: (element) => onlyStyledElements(element, supportsHighlight, {
            conversion: extendTextNodeConversion("b", $applyHighlightStyle),
            priority: 1
          }),
          del: () => ({
            conversion: supportsHighlight
              ? extendTextNodeConversion("s", $applyStrikethrough, $applyHighlightStyle)
              : extendTextNodeConversion("s", $applyStrikethrough),
            priority: 1
          }),
          pre: (element) => onlyPreLanguageElements(element, {
            conversion: extendConversion(CodeNode, "pre", $applyLanguage),
            priority: 1
          })
        }
      }
    })
  }
}

function onlyStyledElements(element, supportsHighlight, conversion) {
  if (!supportsHighlight) return null

  const elementHighlighted = element.style.color !== "" || element.style.backgroundColor !== ""
  return elementHighlighted ? conversion : null
}

function $applyStrikethrough(textNode) {
  if (!textNode.hasFormat("strikethrough")) textNode.toggleFormat("strikethrough")
  return textNode
}

function onlyPreLanguageElements(element, conversion) {
  return element.hasAttribute(TRIX_LANGUAGE_ATTR) ? conversion : null
}

function $applyLanguage(conversionOutput, element) {
  const language = normalizeCodeLang(element.getAttribute(TRIX_LANGUAGE_ATTR))
  conversionOutput.node.setLanguage(language)
}
