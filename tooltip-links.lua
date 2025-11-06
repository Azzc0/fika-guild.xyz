-- tooltip-links.lua
-- Quarto filter for WoW-style tooltip links
-- Converts {{type:id "display"}} shortcodes to HTML spans with data attributes

local json = quarto.json or pandoc.json or require('dkjson')

-- Cache for loaded JSON data
local jsonCache = {}

-- Rarity mapping
local rarityNames = {
  [0] = "poor",
  [1] = "common",
  [2] = "uncommon",
  [3] = "rare",
  [4] = "epic",
  [5] = "legendary"
}

-- Helper: Check if file exists
local function fileExists(path)
  local f = io.open(path, "r")
  if f then
    f:close()
    return true
  end
  return false
end

-- Helper: Read file content
local function readFile(path)
  local file = io.open(path, "r")
  if not file then
    return nil
  end
  local content = file:read("*all")
  file:close()
  return content
end

-- Helper: Try to decompress .gz file (requires gzip command)
local function readGzFile(path)
  -- Try to read decompressed version first
  local handle = io.popen("gzip -dc " .. path .. " 2>/dev/null")
  if not handle then
    return nil
  end
  local content = handle:read("*all")
  handle:close()
  return content
end

-- Load JSON file (with .gz support)
local function loadJson(filename)
  if jsonCache[filename] then
    return jsonCache[filename]
  end
  
  local content = nil
  
  -- Try .gz version first
  if fileExists(filename .. ".gz") then
    content = readGzFile(filename .. ".gz")
  end
  
  -- Fallback to plain JSON
  if not content and fileExists(filename) then
    content = readFile(filename)
  end
  
  if not content then
    quarto.log.warning("Could not load JSON file: " .. filename)
    return nil
  end
  
  local data, pos, err = json.decode(content)
  if err then
    quarto.log.error("JSON parse error in " .. filename .. ": " .. err)
    return nil
  end
  
  jsonCache[filename] = data
  return data
end

-- Look up spell by ID in spells.json
local function lookupSpell(spellId)
  local data = loadJson("spells.json")
  if not data or not data.spells then
    return nil
  end
  
  -- spells.json uses array format: [id, name, rank, icon, ...]
  -- schema: ["id","name","rank","icon","school","desc","cost","powerType","castTime","cooldown","rangeMin","rangeMax","duration","reagents","minLevel","spellLevel","maxLevel"]
  for _, spell in ipairs(data.spells) do
    if spell[1] == spellId then
      return {
        id = spell[1],
        name = spell[2],
        rank = spell[3],
        icon = spell[4],
        school = spell[5],
        description = spell[6]
      }
    end
  end
  
  return nil
end

-- Look up item by ID in items.json
local function lookupItem(itemId)
  local data = loadJson("items.json")
  if not data or not data.items then
    return nil
  end
  
  -- Assuming similar array format to spells
  -- schema: ["id","name","rarity","icon","description",...]
  for _, item in ipairs(data.items) do
    if item[1] == itemId then
      return {
        id = item[1],
        name = item[2],
        rarity = item[3],
        icon = item[4],
        description = item[5]
      }
    end
  end
  
  return nil
end

-- Look up custom entry by section and ID
local function lookupCustom(section, entryId)
  local data = loadJson("custom.json")
  if not data then
    return nil
  end
  
  if not data[section] then
    quarto.log.warning("Custom section not found: " .. section)
    return nil
  end
  
  local entry = data[section][entryId]
  if not entry then
    return nil
  end
  
  -- custom.json uses object format with explicit fields
  -- Return all fields from the entry to preserve complex item data
  local result = {}
  for key, value in pairs(entry) do
    result[key] = value
  end
  return result
end

-- Helper: Generate tooltip HTML content
local function generateTooltipContent(entry, source, section, entryId)
  if source == "spell" or (source == "custom" and section == "spells") then
    -- Generate spell tooltip HTML
    local content = '<div class="spell-title-row">'
    content = content .. '<span class="spell-name">' .. (entry.name or "Unknown Spell") .. '</span>'
    if entry.rank and entry.rank ~= "" then
      content = content .. '<span class="spell-rank">' .. entry.rank .. '</span>'
    end
    content = content .. '</div>'
    
    -- Cost and range (only if they exist)
    local cost = 0
    local rangeMax = 0
    if entry.cost then
      cost = string.match(entry.cost, "%d+") or 0
      cost = tonumber(cost) or 0
    end
    if entry.range then
      rangeMax = string.match(entry.range, "%d+") or 0
      rangeMax = tonumber(rangeMax) or 0
    end
    
    if cost > 0 or rangeMax > 0 then
      content = content .. '<div class="spell-cost-range-row">'
      content = content .. '<span class="spell-cost">' .. (cost > 0 and (cost .. " mana") or "") .. '</span>'
      content = content .. '<span class="spell-range">' .. (rangeMax > 0 and (rangeMax .. " yd range") or "") .. '</span>'
      content = content .. '</div>'
    end
    
    -- Cast time
    if entry.castTime then
      local castTimeNum = string.match(entry.castTime, "(%d+%.?%d*)")
      if castTimeNum then
        content = content .. '<div class="spell-cast-time">' .. castTimeNum .. ' sec cast</div>'
      end
    end
    
    -- Reagents (for custom spells)
    if entry.reagents then
      content = content .. '<div class="spell-reagents">Reagents: ' .. entry.reagents .. '</div>'
    end
    
    -- Tools (for custom spells)
    if entry.tools then
      content = content .. '<div class="spell-tools">Tools: ' .. entry.tools .. '</div>'
    end
    
    -- Description
    content = content .. '<div class="spell-description">'
    content = content .. (entry.description or "No description available.")
    content = content .. '</div>'
    
    return content
    
  elseif source == "item" or (source == "custom" and section == "items") then
    -- Generate item tooltip HTML (simplified structure)
    local rarityClass = rarityNames[entry.rarity] or "common"
    
    local content = '<div class="item-header">'
    content = content .. '<p class="item-title ' .. rarityClass .. '">' .. (entry.name or "Unknown Item") .. '</p>'
    if entry.binding then
      content = content .. '<p class="item-binding">' .. entry.binding .. '</p>'
    end
    if entry.unique then
      content = content .. '<p class="item-unique">Unique</p>'
    end
    content = content .. '</div>'
    
    -- Item type (simplified to single line)
    if entry.item_type then
      content = content .. '<div class="item-type">' .. entry.item_type .. '</div>'
    end
    
    -- Armor
    if entry.armor then
      content = content .. '<div class="item-armor">' .. entry.armor .. '</div>'
    end
    
    -- Damage and speed (simplified to single line)
    if entry.damage and entry.speed then
      content = content .. '<div class="item-damage-speed">' .. entry.damage .. ' - ' .. entry.speed .. '</div>'
    end
    
    -- DPS
    if entry.dps then
      content = content .. '<div class="item-dps">(' .. entry.dps .. ')</div>'
    end
    
    -- Stats (simplified)
    if entry.stats then
      for _, stat in ipairs(entry.stats) do
        content = content .. '<div class="item-stat">' .. stat .. '</div>'
      end
    end
    
    -- Durability
    if entry.durability then
      content = content .. '<div class="item-durability">Durability ' .. entry.durability .. '</div>'
    end
    
    -- Level requirement
    if entry.level_requirement then
      content = content .. '<div class="item-level-req">' .. entry.level_requirement .. '</div>'
    end
    
    -- Special effects
    if entry.description and entry.description ~= "" then
      content = content .. '<div class="item-special-effect">' .. entry.description .. '</div>'
    end
    
    -- Crafting (simplified)
    if entry.crafting then
      content = content .. '<div class="crafting-frame">'
      content = content .. '<div class="crafting-title">' .. (entry.crafting.profession or "Crafted") .. '</div>'
      
      if entry.crafting.castTime then
        content = content .. '<div class="crafting-cast-time">' .. entry.crafting.castTime .. '</div>'
      end
      
      if entry.crafting.reagents then
        content = content .. '<div class="crafting-reagents">Reagents: ' .. entry.crafting.reagents .. '</div>'
      end
      
      if entry.crafting.tools then
        content = content .. '<div class="crafting-tools">Tools: ' .. entry.crafting.tools .. '</div>'
      end
      
      content = content .. '</div>'
    end
    
    return content
    
  else
    -- Generate generic tooltip HTML for achievements, etc.
    local rarityClass = rarityNames[entry.rarity] or "common"
    local typeLabel = ""
    if section == "achievements" then
      typeLabel = "Achievement"
    end
    
    local content = '<div class="tooltip-header">'
    content = content .. '<p class="tooltip-title ' .. rarityClass .. '">' .. (entry.name or "Unknown Entry") .. '</p>'
    if typeLabel ~= "" then
      content = content .. '<p class="tooltip-subtitle">' .. typeLabel .. '</p>'
    end
    content = content .. '</div>'
    
    content = content .. '<div class="tooltip-description">'
    content = content .. (entry.description or "No description available.")
    content = content .. '</div>'
    
    return content
  end
end

-- Create fallback entry for missing data
local function createFallback(source, id)
  return {
    name = "Missing entry",
    icon = "inv_misc_questionmark",
    rarity = 1,
    description = ""
  }
end

-- Parse shortcode and generate HTML
local function processShortcode(shortcode)
  -- ENHANCED SYNTAX: {{source[.section]:id ["display"] [flags...]}}
  -- Examples: 
  --   {{spell:133}}
  --   {{spell:2136 "FB"}}
  --   {{spell:133 "Fire" no-icon}}
  --   {{custom.items:potion "FAP" no-tooltip-icon}}
  
  local source, section, id, displayText = "", "", "", ""
  local flags = {}
  
  -- Remove outer braces and get inner content
  local inner = shortcode:match("^{{(.*)}}$")
  if not inner then
    quarto.log.warning("Malformed shortcode: " .. shortcode)
    return pandoc.Str(shortcode)
  end
  
  -- Parse: source[.section]:id ["display"] [flags...]
  local colon_pos = inner:find(":")
  if not colon_pos then
    quarto.log.warning("Malformed shortcode (no colon): " .. shortcode)
    return pandoc.Str(shortcode)
  end
  
  local source_part = inner:sub(1, colon_pos - 1)
  local rest = inner:sub(colon_pos + 1)
  
  -- Parse source part for dot notation
  local dot_pos = source_part:find("%.")
  if dot_pos then
    source = source_part:sub(1, dot_pos - 1)
    section = source_part:sub(dot_pos + 1)
  else
    source = source_part
    section = ""
  end
  
  -- Parse rest for id, optional display text, and flags
  -- Check if there's a quoted string anywhere in the rest
  local quote_start = rest:find('"')
  if quote_start then
    -- Extract ID (everything before the first space or quote)
    id = rest:match('^(%S+)')
    
    -- Extract quoted display text
    displayText = rest:match('"([^"]*)"')
    
    -- Get everything after the closing quote for flags
    local quote_end = rest:find('"[^"]*"')
    if quote_end then
      local after_quote = rest:sub(quote_end + 1):match('^%s*(.*)')
      if after_quote and after_quote ~= "" then
        for flag in after_quote:gmatch("%S+") do
          flags[flag] = true
        end
      end
    end
  else
    -- No quoted text, parse id and flags normally
    local parts = {}
    for part in rest:gmatch("%S+") do
      table.insert(parts, part)
    end
    
    if #parts == 0 then
      quarto.log.warning("Malformed shortcode (no id): " .. shortcode)
      return pandoc.Str(shortcode)
    end
    
    id = parts[1]
    -- Remaining parts are flags
    for i = 2, #parts do
      flags[parts[i]] = true
    end
  end
  
  if not source or source == "" or not id or id == "" then
    quarto.log.warning("Malformed shortcode: " .. shortcode)
    return pandoc.Str(shortcode)
  end
  
  -- Determine type and lookup entry
  local entry = nil
  local dataType = source
  local cssType = source
  local numericId = tonumber(id)
  
  if source == "spell" then
    if not numericId then
      quarto.log.warning("Spell ID must be numeric: " .. id)
      entry = createFallback(source, id)
    else
      -- First check for custom spell entries
      local customSpell = lookupCustom("spells", id)
      if customSpell then
        entry = customSpell
      else
        -- Fallback to spells.json
        entry = lookupSpell(numericId)
        if not entry then
          quarto.log.warning("Spell not found: " .. id)
          entry = createFallback(source, id)
        end
      end
    end
    
  elseif source == "item" then
    if not numericId then
      quarto.log.warning("Item ID must be numeric: " .. id)
      entry = createFallback(source, id)
    else
      entry = lookupItem(numericId)
      if not entry then
        quarto.log.warning("Item not found: " .. id)
        entry = createFallback(source, id)
      end
    end
    
  elseif source == "custom" then
    if section == "" then
      quarto.log.warning("Custom shortcode requires section: {{custom.SECTION:id}}")
      entry = createFallback(source, id)
    else
      entry = lookupCustom(section, id)
      if not entry then
        quarto.log.warning("Custom entry not found: " .. section .. ":" .. id)
        entry = createFallback(source, id)
      end
      dataType = "custom." .. section
      -- For CSS, use the section as type (e.g., "items", "achievements", "spells")
      if section == "achievements" then
        cssType = "achievement"
      elseif section == "items" then
        cssType = "item"
      elseif section == "spells" then
        cssType = "spell"
      else
        -- Default: remove 's' suffix and lowercase
        cssType = section:gsub("s$", "")
      end
    end
    
  else
    quarto.log.warning("Unknown source type: " .. source)
    return pandoc.Str(shortcode)
  end
  
  
  -- Determine display text 
  local finalDisplayText = ""
  if displayText and displayText ~= "" then
    finalDisplayText = displayText
  else
    -- Use the name from data lookup (will be set below)
    finalDisplayText = nil  -- Will be set after data lookup
  end
  
  -- Determine flags
  local showInlineIcon = not flags["no-icon"]
  local showTooltipIcon = not flags["no-tooltip-icon"]
  
  -- Get rarity class name
  local rarityClass = ""
  if entry.rarity then
    rarityClass = rarityNames[entry.rarity] or "common"
  end
  
  -- Set final display text if not provided
  if not finalDisplayText then
    finalDisplayText = entry.name
  end
  
  -- Wrap in brackets
  finalDisplayText = "[" .. finalDisplayText .. "]"
  
  -- Build icon URL for CSS variable
  local iconUrl = ""
  if entry.icon then
    iconUrl = "https://res.cloudinary.com/dhmmkvcpy/image/upload/q_auto,f_auto/Interface/Icons/" .. entry.icon .. ".jpg"
  end
  
  -- Build HTML attributes
  local classes = {"turtle-link", cssType}
  if rarityClass ~= "" then
    table.insert(classes, rarityClass)
  end
  
  -- Generate tooltip content HTML
  local tooltipContent = generateTooltipContent(entry, source, section, id)
  -- Properly escape for HTML attribute - escape quotes, apostrophes, and newlines
  tooltipContent = tooltipContent:gsub('"', '&quot;')
  tooltipContent = tooltipContent:gsub("'", '&#39;')
  tooltipContent = tooltipContent:gsub('\n', '')
  tooltipContent = tooltipContent:gsub('\r', '')
  
  local attributes = {
    class = table.concat(classes, " "),
    ["data-type"] = dataType,
    ["data-id"] = tostring(id),
    ["data-icon"] = entry.icon or "inv_misc_questionmark",
    ["data-show-inline-icon"] = showInlineIcon and "true" or "false",
    ["data-show-tooltip-icon"] = showTooltipIcon and "true" or "false",
    ["data-tooltip-content"] = tooltipContent,
    style = iconUrl ~= "" and ("--turtle-icon: url('" .. iconUrl .. "')") or ""
  }
  
  if entry.rarity then
    attributes["data-rarity"] = tostring(entry.rarity)
  end
  
  -- Build attribute string
  local attr_parts = {}
  for key, value in pairs(attributes) do
    if value ~= "" then
      table.insert(attr_parts, string.format('%s="%s"', key, value))
    end
  end
  
  -- Determine URL for turtle-wow database
  local dbUrl = ""
  if source == "spell" then
    dbUrl = "https://database.turtle-wow.org/?spell=" .. tostring(id)
  elseif source == "item" then
    dbUrl = "https://database.turtle-wow.org/?item=" .. tostring(id)
  elseif source == "custom" and section == "items" and entry.id then
    -- Custom items link to database only if they have a database ID
    dbUrl = "https://database.turtle-wow.org/?item=" .. tostring(entry.id)
  elseif source == "custom" and section == "spells" and entry.id then
    -- Custom spells link to database if they have a database ID
    dbUrl = "https://database.turtle-wow.org/?spell=" .. tostring(entry.id)
  end
  -- Note: achievements and other custom entries without IDs won't get links
  
  -- Create linked span element
  if dbUrl ~= "" then
    return pandoc.RawInline(
      'html',
      string.format(
        '<a href="%s" target="_blank" rel="noopener"><span %s>%s</span></a>',
        dbUrl,
        table.concat(attr_parts, " "),
        finalDisplayText
      )
    )
  else
    -- Non-linkable content (achievements, etc.) - just span
    return pandoc.RawInline(
      'html',
      string.format(
        '<span %s>%s</span>',
        table.concat(attr_parts, " "),
        finalDisplayText
      )
    )
  end
end

-- Process text to find and replace multiple shortcodes
local function processTextWithShortcodes(text)
  local result = {}
  local pos = 1
  
  while pos <= #text do
    -- Find the next shortcode
    local start_pos, end_pos = text:find("{{[^}]*}}", pos)
    
    if start_pos then
      -- Add text before the shortcode (if any)
      if start_pos > pos then
        local before = text:sub(pos, start_pos - 1)
        table.insert(result, pandoc.Str(before))
      end
      
      -- Process the shortcode
      local shortcode = text:sub(start_pos, end_pos)
      local processed = processShortcode(shortcode)
      table.insert(result, processed)
      
      -- Move position after this shortcode
      pos = end_pos + 1
    else
      -- No more shortcodes, add remaining text
      if pos <= #text then
        local remaining = text:sub(pos)
        table.insert(result, pandoc.Str(remaining))
      end
      break
    end
  end
  
  return result
end

-- Process inline elements to catch shortcodes
function Inlines(inlines)
  local result = {}
  local i = 1
  
  while i <= #inlines do
    local elem = inlines[i]
    
    if elem.t == "Str" and elem.text:find("{{") then
      -- Collect all elements that might be part of shortcodes
      local full_text = elem.text
      local j = i + 1
      
      -- Keep collecting following elements until we have all potential shortcode text
      -- We need to be more careful here - collect until we have balanced braces
      local brace_count = 0
      for char in elem.text:gmatch(".") do
        if char == "{" then brace_count = brace_count + 1
        elseif char == "}" then brace_count = brace_count - 1 end
      end
      
      while j <= #inlines and brace_count > 0 do
        local next_elem = inlines[j]
        if next_elem.t == "Str" then
          full_text = full_text .. next_elem.text
          for char in next_elem.text:gmatch(".") do
            if char == "{" then brace_count = brace_count + 1
            elseif char == "}" then brace_count = brace_count - 1 end
          end
        elseif next_elem.t == "Space" then
          full_text = full_text .. " "
        else
          break  -- Stop if we hit something that's not text or space
        end
        j = j + 1
      end
      
      -- Process all shortcodes in the collected text
      local processed_elements = processTextWithShortcodes(full_text)
      for _, processed_elem in ipairs(processed_elements) do
        table.insert(result, processed_elem)
      end
      
      i = j  -- Skip all consumed elements
    else
      table.insert(result, elem)
      i = i + 1
    end
  end
  
  return result
end

-- Return filter
return {
  {Inlines = Inlines}
}