// Canonical heading levels the toolbar can offer, ordered largest to smallest.
// The `name`/`command` for h2-h4 are the original public contract — referenced by
// host adapters, the toolbar template, and the native `editor-initialized` event —
// so they must not change. h1 adds a new name/command. Which of these levels are
// actually offered is driven by the `headings` configuration option.
export const HEADING_LEVELS = [
  { tag: "h1", name: "heading-huge", command: "setFormatHeadingHuge", label: "Huge heading" },
  { tag: "h2", name: "heading-large", command: "setFormatHeadingLarge", label: "Large heading" },
  { tag: "h3", name: "heading-medium", command: "setFormatHeadingMedium", label: "Medium heading" },
  { tag: "h4", name: "heading-small", command: "setFormatHeadingSmall", label: "Small heading" },
]
