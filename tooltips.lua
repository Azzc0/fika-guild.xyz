-- tooltips.lua (minimal version)
function Span(el)
  if el.content and #el.content == 1 and el.content[1].tag == "Str" then
    local text = el.content[1].text
    local pattern = "^<<<(%w+):([%w_]+)(|([^>]*))?>>>$"
    local type, id, has_display, display_text = text:match(pattern)
    
    if type and id then
      local display_content = display_text or ""
      return pandoc.Span(
        pandoc.Str(display_content),
        {
          class = "turtle-link",
          ["data-turtle-tooltip"] = "",
          ["data-type"] = type,
          ["data-id"] = id
        }
      )
    end
  end
  return el
end