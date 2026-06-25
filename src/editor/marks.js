// Inline marks that can be enabled or disabled through the `marks` option.
// Frozen because the editor's enabledMarks getter can return it directly.
export const MARK_TYPES = Object.freeze([ "bold", "italic", "strikethrough", "underline" ])

// Semantic HTML tags each mark is imported from. Deleting these tags from the
// editor's html conversions strips the mark on import: the default TextNode
// conversion and the legacy Trix conversion share the same tag key, so dropping
// the key removes both. (`del` is contributed by the Trix content extension; the
// rest come from Lexical's TextNode.importDOM.)
//
// Note: because the Trix conversion under these keys also carries legacy highlight
// color (e.g. `<em style="color:…">`), disabling a mark drops that co-located color
// too — an accepted consequence of stripping a now-disabled feature on load.
export const MARK_TO_TAGS = {
  bold: [ "b", "strong" ],
  italic: [ "i", "em" ],
  strikethrough: [ "s", "del" ],
  underline: [ "u" ]
}

// Drop the markdown transformers that would produce a disabled mark. Text-format
// transformers expose a `format` array (e.g. ["bold"] or ["bold", "italic"]); a
// combined transformer is dropped when either of its formats is disabled.
// Transformers without a `format` (headings, lists, links…) are left untouched.
export function withoutDisabledMarkTransformers(transformers, disabledMarks) {
  if (disabledMarks.length === 0) return transformers

  const disabled = new Set(disabledMarks)
  return transformers.filter((transformer) =>
    !Array.isArray(transformer.format) || !transformer.format.some((format) => disabled.has(format))
  )
}
