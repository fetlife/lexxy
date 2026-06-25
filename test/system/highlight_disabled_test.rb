require "application_system_test_case"

class HighlightDisabledTest < ApplicationSystemTestCase
  setup do
    visit edit_post_path(posts(:empty), highlight_disabled: true)
    wait_for_editor
  end

  test "the highlight dropdown is not visible" do
    assert_no_selector "lexxy-toolbar [name='highlight']"
  end

  test "saved highlighted content is stripped on load and round-trips without it" do
    # Covers both highlight representations: <mark> and legacy Trix styled elements (em/strong with color).
    find_editor.value = '<p><mark style="color: var(--highlight-1);">red</mark> <em style="color: var(--highlight-2);">ital</em> <strong style="background-color: var(--highlight-bg-3);">bold</strong> plain</p>'

    assert_text "red"
    assert_text "plain"
    assert_no_match(/<mark/, find_editor.value)
    assert_no_match(/color:/, find_editor.value)

    click_on "Update Post"

    within "article.post" do
      assert_no_selector "mark"
      assert_no_selector "[style*='color']"
      assert_text "red"
      assert_text "ital"
      assert_text "bold"
      assert_text "plain"
    end

    click_on "Edit this post"
    wait_for_editor
    assert_no_match(/<mark/, find_editor.value)
    assert_no_match(/color:/, find_editor.value)
    assert_includes find_editor.value, "red"
  end
end
