require "application_system_test_case"

class CodeDisabledTest < ApplicationSystemTestCase
  setup do
    visit edit_post_path(posts(:empty), code_disabled: true)
    wait_for_editor
  end

  test "the Code toolbar button is not rendered" do
    assert_no_selector "lexxy-toolbar button[name='code']"
  end

  test "a markdown code fence does not create a code block and is not persisted" do
    find_editor.send "```"
    find_editor.send :enter
    find_editor.send "puts 1"

    # Code blocks render as <code> in the editor's live DOM.
    assert_no_selector "lexxy-editor code"

    click_on "Update Post"

    within "article.post" do
      assert_no_selector "pre"
      assert_text "puts 1"
    end
  end

  test "a saved code block is stripped to plain text on load and round-trips without one" do
    find_editor.value = '<pre data-language="ruby"><code>def hi</code></pre>'

    assert_no_selector "lexxy-editor code"
    assert_text "def hi"

    click_on "Update Post"

    within "article.post" do
      assert_no_selector "pre"
      assert_text "def hi"
    end

    click_on "Edit this post"
    wait_for_editor
    assert_no_match(/<pre/, find_editor.value)
  end
end
