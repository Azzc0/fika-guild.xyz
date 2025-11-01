function Div(el)
  if el.classes[1] == 'details' and el.attributes.summary then
    local open_attr = ''
    if el.attributes.open == 'true' or el.attributes.open == '' then
      open_attr = ' open'
    end
    
    return {
      pandoc.RawBlock('html', '<details' .. open_attr .. '>'),
      pandoc.RawBlock('html', '<summary>' .. el.attributes.summary .. '</summary>'),
      el,
      pandoc.RawBlock('html', '</details>')
    }
  end
  return el
end