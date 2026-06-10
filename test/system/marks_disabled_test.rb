require "application_system_test_case"

class MarksDisabledTest < ApplicationSystemTestCase
  test "marks disabled in config are stripped when a previously-saved post is loaded" do
    # Save marked content with a default (all-marks) editor so the stored post really
    # contains the disabled marks.
    visit edit_post_path(posts(:empty))
    find_editor.value = "<p><strong>keep</strong> <s>strike</s> <u>under</u></p>"
    assert_equal_html "<p><strong>keep</strong> <s>strike</s> <u>under</u></p>", find_editor.value
    click_on "Update Post"

    # Re-open the saved post with strikethrough + underline disabled: stripped on load.
    visit edit_post_path(posts(:empty), marks: '["bold", "italic"]')
    assert_equal_html "<p><strong>keep</strong> strike under</p>", find_editor.value

    # Saving from the limited editor persists the stripped content (rendered + re-edited).
    click_on "Update Post"
    assert_selector "strong", text: "keep"
    assert_no_selector "s"
    assert_no_selector "u"

    visit edit_post_path(posts(:empty), marks: '["bold", "italic"]')
    assert_equal_html "<p><strong>keep</strong> strike under</p>", find_editor.value
  end

  test "all marks survive the round-trip by default" do
    visit edit_post_path(posts(:empty))

    find_editor.value = "<p><strong>b</strong> <em>i</em> <s>s</s> <u>u</u></p>"
    assert_equal_html "<p><strong>b</strong> <em>i</em> <s>s</s> <u>u</u></p>", find_editor.value

    click_on "Update Post"
    click_on "Edit this post"

    assert_equal_html "<p><strong>b</strong> <em>i</em> <s>s</s> <u>u</u></p>", find_editor.value
  end
end
