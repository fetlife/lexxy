class SandboxController < ApplicationController
  ALLOWED_TEMPLATES = %w[default tables code lists highlights images empty fetlife]

  # Editor configuration overrides per template. Keys map to dasherized
  # <lexxy-editor> attributes; values are JSON-encoded so the editor's
  # attribute parser (JSON.parse with raw-string fallback) reads them correctly.
  EDITOR_OPTIONS = {
    "fetlife" => {
      code: "false",
      highlight: '{"enabled":false}',
      marks: '["bold","italic","strikethrough"]',
      tables: "false",
      headings: '["h1","h2","h3","h4"]'
    }
  }.freeze

  def show
    @template = if params[:template].presence_in ALLOWED_TEMPLATES
      params[:template]
    else
      "default"
    end

    @editor_options = EDITOR_OPTIONS.fetch(@template, {})
  end
end
