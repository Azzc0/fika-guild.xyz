import json
import urllib.request
import urllib.error
import re
import time
import os

SKILL_MAP_PATH = "skill_map.json"
OUTPUT_PATH = "skill_presentation.json"
DOMAIN = "wowgaming.altervista.org/aowow"

SKILL_LINES = {
    "171": "Alchemy",
    "164": "Blacksmithing",
    "333": "Enchanting",
    "202": "Engineering",
    "755": "Jewelcrafting",
    "165": "Leatherworking",
    "197": "Tailoring",
    "185": "Cooking",
    "129": "First Aid",
    "773": "Inscription"
}

# ---------------------------------------------------------------------------
# Item class/subclass -> human-readable group label
# Used to categorise the *crafted* item, not the spell itself.
# Reference: https://wowwiki-archive.fandom.com/wiki/ItemType
# ---------------------------------------------------------------------------

# Item class 4 = Armor, subclass = armor type
ARMOR_SUBCLASS = {
    0: "Miscellaneous Armor",
    1: "Cloth",
    2: "Leather",
    3: "Mail",
    4: "Plate",
    6: "Shield",
    10: "Idol",
    11: "Libram",
    12: "Totem",
}

# Item class 2 = Weapon, subclass = weapon type
WEAPON_SUBCLASS = {
    0: "Axes (1H)",
    1: "Axes (2H)",
    2: "Bows",
    3: "Guns",
    4: "Maces (1H)",
    5: "Maces (2H)",
    6: "Polearms",
    7: "Swords (1H)",
    8: "Swords (2H)",
    10: "Staves",
    13: "Fist Weapons",
    15: "Daggers",
    18: "Crossbows",
    19: "Wands",
    20: "Fishing Poles",
}

# Inventory type (equip slot) — used to further split armor into slots
# Only listing ones relevant to crafted gear
INVENTORY_TYPE = {
    1:  "Head",
    3:  "Shoulder",
    4:  "Shirt",
    5:  "Chest",
    6:  "Waist",
    7:  "Legs",
    8:  "Feet",
    9:  "Wrists",
    10: "Hands",
    11: "Finger",
    12: "Trinket",
    13: "Weapon",
    14: "Shield",
    15: "Ranged",
    16: "Back",
    17: "Two-Hand",
    19: "Chest",   # robe = chest
    20: "Chest",   # robe variant
    21: "Main Hand",
    22: "Off Hand",
    23: "Held In Off-hand",
    26: "Thrown",
}

# Item class 0 = Consumable
CONSUMABLE_SUBCLASS = {
    0: "Consumable",
    1: "Potion",
    2: "Elixir",
    3: "Flask",
    4: "Scroll",
    5: "Food & Drink",
    6: "Item Enhancement",
    7: "Bandage",
    8: "Other Consumable",
}

# Item class 7 = Trade Goods
TRADE_GOOD_SUBCLASS = {
    0: "Trade Goods",
    1: "Parts",
    2: "Explosives",
    3: "Devices",
    4: "Jewelcrafting",
    5: "Cloth",
    6: "Leather",
    7: "Metal & Stone",
    8: "Meat",
    9: "Herb",
    10: "Elemental",
    11: "Other Trade Goods",
    12: "Enchanting",
    13: "Materials",
    14: "Armor Enchantment",
    15: "Weapon Enchantment",
}

# Item class 9 = Recipe
RECIPE_SUBCLASS = {
    0: "Book",
    1: "Leatherworking Pattern",
    2: "Tailoring Pattern",
    3: "Engineering Schematic",
    4: "Blacksmithing Plan",
    5: "Cooking Recipe",
    6: "Alchemy Recipe",
    7: "First Aid Manual",
    8: "Enchanting Formula",
    9: "Fishing Manual",
    10: "Jewelcrafting Design",
    11: "Inscription Technique",
}

# Gem colors by item name keywords (Jewelcrafting-specific)
GEM_COLOR_KEYWORDS = {
    "Crimson": "Red Gems",
    "Runed": "Red Gems",
    "Bold": "Red Gems",
    "Delicate": "Red Gems",
    "Flashing": "Red Gems",
    "Bright": "Red Gems",
    "Subtle": "Red Gems",
    "Teardrop": "Red Gems",
    "Scarlet": "Red Gems",
    "Ruby": "Red Gems",
    "Rubelite": "Red Gems",
    "Solid": "Blue Gems",
    "Sparkling": "Blue Gems",
    "Stormy": "Blue Gems",
    "Lustrous": "Blue Gems",
    "Star": "Blue Gems",
    "Sapphire": "Blue Gems",
    "Rigid": "Blue Gems",
    "Subtle": "Blue Gems",
    "Gleaming": "Yellow Gems",
    "Smooth": "Yellow Gems",
    "Thick": "Yellow Gems",
    "Brilliant": "Yellow Gems",
    "Mystic": "Yellow Gems",
    "Quick": "Yellow Gems",
    "Fractured": "Yellow Gems",
    "Polished": "Yellow Gems",
    "Luminous": "Orange Gems",
    "Potent": "Orange Gems",
    "Wicked": "Orange Gems",
    "Veiled": "Orange Gems",
    "Reckless": "Orange Gems",
    "Deadly": "Orange Gems",
    "Durable": "Orange Gems",
    "Resolute": "Orange Gems",
    "Inscribed": "Orange Gems",
    "Fierce": "Orange Gems",
    "Glinting": "Orange Gems",
    "Accurate": "Orange Gems",
    "Pristine": "Orange Gems",
    "Empowered": "Orange Gems",
    "Etched": "Orange Gems",
    "Champion's": "Orange Gems",
    "Shifting": "Green Gems",
    "Enduring": "Green Gems",
    "Jagged": "Green Gems",
    "Nimble": "Green Gems",
    "Regal": "Green Gems",
    "Forceful": "Green Gems",
    "Puissant": "Green Gems",
    "Deft": "Green Gems",
    "Steady": "Green Gems",
    "Vivid": "Green Gems",
    "Turbid": "Green Gems",
    "Shattered": "Green Gems",
    "Misty": "Green Gems",
    "Radiant": "Green Gems",
    "Lambent": "Green Gems",
    "Energized": "Green Gems",
    "Intricate": "Green Gems",
    "Sundered": "Green Gems",
    "Assassin's": "Green Gems",
    "Fluorescent": "Green Gems",
    "Rambunctious": "Green Gems",
    "Tense": "Green Gems",
    "Mysterious": "Purple Gems",
    "Glowing": "Purple Gems",
    "Sovereign": "Purple Gems",
    "Shifting": "Purple Gems",
    "Royal": "Purple Gems",
    "Infused": "Purple Gems",
    "Defender's": "Purple Gems",
    "Balanced": "Purple Gems",
    "Puissant": "Purple Gems",
    "Guardian's": "Purple Gems",
    "Purified": "Purple Gems",
    "Blessed": "Purple Gems",
    "Tenuous": "Purple Gems",
    "Timeless": "Purple Gems",
    "Truestrike": "Purple Gems",
    "Opaque": "Purple Gems",
}

GEM_META_KEYWORDS = [
    "Austere", "Beaming", "Bracing", "Burning", "Chaotic", "Destructive",
    "Earthen", "Effulgent", "Ember", "Enigmatic", "Eternal", "Forlorn",
    "Impassive", "Insightful", "Persistent", "Powerful", "Relentless",
    "Revitalizing", "Swift", "Thundering", "Tireless", "Trenchant",
    "Skyflare", "Earthsiege",
]

JEWELRY_KEYWORDS = ["Ring", "Band", "Signet", "Loop", "Seal", "Necklace",
                     "Amulet", "Pendant", "Choker", "Chain", "Locket"]


def fetch_html(spell_id, retries=3):
    url = f"https://{DOMAIN}/?spell={spell_id}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 500 and attempt < retries - 1:
                time.sleep((attempt + 1) * 2)
                continue
            break
        except Exception:
            break
    return None


def extract_js_object(html, var_name, obj_id):
    """
    Extracts a JS object literal assigned like:
        var _ = g_items; _[6048]={"quality":1,"icon":"inv_potion_44",...};
    Returns a dict or None.
    """
    # Match _[id]={...}; — handles nested braces via a simple depth counter
    pattern = rf'_\[{obj_id}\]=(\{{)'
    match = re.search(pattern, html)
    if not match:
        # Try without the _ alias (e.g. direct assignment)
        return None
    start = match.start(1)
    depth = 0
    i = start
    for i, ch in enumerate(html[start:], start):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                break
    json_str = html[start:i + 1]
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return None


def extract_listview(html, lv_id):
    """
    Extracts the data array from a Listview(...) call with a given id.
    Returns a list or None.
    """
    pattern = rf'new Listview\(\{{[^{{]*?"id":"{lv_id}".*?"data":(\[)'
    match = re.search(pattern, html, re.DOTALL)
    if not match:
        return None
    start = match.start(1)
    depth = 0
    i = start
    for i, ch in enumerate(html[start:], start):
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                break
    json_str = html[start:i + 1]
    # Strip JS expressions that aren't valid JSON (e.g. Listview.extraCols.percent)
    json_str = re.sub(r',\s*Listview\.[^\]]+', '', json_str)
    json_str = re.sub(r',\s*LANG\.[^\]]+', '', json_str)
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return None


def extract_spell_name(html, spell_id):
    """Pull spell name from g_spells[id] JS object."""
    obj = extract_js_object(html, "g_spells", spell_id)
    if obj and "name_enus" in obj:
        return obj["name_enus"]
    # Fallback: page <title>
    m = re.search(r'<title>([^<]+?) - Spell', html)
    if m:
        return m.group(1).strip()
    return None


def extract_skill_colors(html):
    """
    Extract difficulty thresholds from the Markup.printHtml call.
    Example: Difficulty: [color=r1]135[/color] [color=r2]160[/color] ...
    Returns (orange_threshold, yellow, green, gray) or (0,0,0,0).
    """
    m = re.search(
        r'Difficulty:.*?\[color=r1\](\d+)\[/color\].*?\[color=r2\](\d+)\[/color\]'
        r'.*?\[color=r3\](\d+)\[/color\].*?\[color=r4\](\d+)\[/color\]',
        html
    )
    if m:
        return tuple(int(x) for x in m.groups())  # orange, yellow, green, gray
    # Alternative: parse "Requires SkillName (N)" for the minimum
    m2 = re.search(r'Requires.*?\((\d+)\)', html)
    if m2:
        req = int(m2.group(1))
        return (req, req, req, req)
    return (0, 0, 0, 0)


def extract_reagents(html):
    """
    Build reagents list from g_items JS objects + the reagent-list table.
    Returns list of {"name": str, "count": int, "icon": str, "item_id": int}
    """
    reagents = []
    # Find item IDs in the reagent table
    item_ids = re.findall(r'reagent-list-generic\.\d+-(\d+)', html)
    for item_id_str in item_ids:
        item_id = int(item_id_str)
        obj = extract_js_object(html, "g_items", item_id)
        name = obj.get("name_enus", f"Item #{item_id}") if obj else f"Item #{item_id}"
        icon = obj.get("icon", "inv_misc_questionmark") if obj else "inv_misc_questionmark"
        # Count: look for createIcon(item_id, 0, N) where N is stack count
        count_match = re.search(
            rf'createIcon\({item_id},\s*0,\s*(\d+)\)', html
        )
        count = int(count_match.group(1)) if count_match else 1
        reagents.append({
            "item_id": item_id,
            "name": name,
            "count": count,
            "icon": icon,
        })
    return reagents


def extract_crafted_item(html):
    """
    Pull crafted item data from the 'contains' Listview.
    Returns dict with id, name, icon, classs, subclass, reqlevel, inventorytype or None.
    """
    data = extract_listview(html, "contains")
    if not data:
        return None
    item = data[0]
    # g_items may have icon
    obj = extract_js_object(html, "g_items", item["id"])
    icon = obj.get("icon", "inv_misc_questionmark") if obj else item.get("icon", "inv_misc_questionmark")
    # name in listview has a quality prefix digit, strip it
    raw_name = item.get("name", "")
    name = re.sub(r'^\d', '', raw_name).strip()
    return {
        "item_id": item["id"],
        "name": name,
        "icon": icon,
        "item_class": item.get("classs", -1),
        "item_subclass": item.get("subclass", -1),
        "reqlevel": item.get("reqlevel", 0),
        "inventory_type": item.get("slot", item.get("inventorytype", 0)),
    }


def determine_group(spell_name, crafted_item, prof_name):
    """
    Determine the display group for a recipe based on the crafted item's
    item class/subclass/inventory_type, falling back to name heuristics.
    """
    if crafted_item is None:
        # Enchanting: spells that buff items don't create an item
        if prof_name == "Enchanting":
            name = spell_name.lower()
            for slot in ["weapon", "shield", "chest", "gloves", "bracer",
                         "boots", "cloak", "ring", "head", "legs", "shoulder"]:
                if slot in name:
                    return slot.title() + " Enchants"
            return "Enchants"
        return "Miscellaneous"

    ic = crafted_item["item_class"]
    isc = crafted_item["item_subclass"]
    inv = crafted_item["inventory_type"]
    name = crafted_item["name"]

    # --- Consumables (class 0) ---
    if ic == 0:
        return CONSUMABLE_SUBCLASS.get(isc, "Consumable")

    # --- Weapons (class 2) ---
    if ic == 2:
        return WEAPON_SUBCLASS.get(isc, "Weapons")

    # --- Armor (class 4) ---
    if ic == 4:
        if isc == 6:
            return "Shields"
        # Group by equip slot first, then material
        slot_label = INVENTORY_TYPE.get(inv, "")
        material = ARMOR_SUBCLASS.get(isc, "")
        if slot_label:
            return slot_label
        return material or "Armor"

    # --- Projectiles (class 6) ---
    if ic == 6:
        return "Ammunition"

    # --- Trade Goods (class 7) ---
    if ic == 7:
        if prof_name == "Jewelcrafting":
            # Gems are trade goods subclass 4
            if isc == 4:
                for keyword, color in GEM_COLOR_KEYWORDS.items():
                    if keyword.lower() in name.lower():
                        return color
                for keyword in GEM_META_KEYWORDS:
                    if keyword.lower() in name.lower():
                        return "Meta Gems"
                return "Gems"
            # Rings / necklaces
            for kw in JEWELRY_KEYWORDS:
                if kw.lower() in name.lower():
                    return "Jewelry"
        return TRADE_GOOD_SUBCLASS.get(isc, "Trade Goods")

    # --- Recipes (class 9) ---
    if ic == 9:
        return "Recipes"

    # --- Quivers / Ammo pouches (class 11) ---
    if ic == 11:
        return "Quivers & Pouches"

    return "Miscellaneous"


# Group display order per profession
PROFESSION_GROUP_ORDER = {
    "Alchemy":        ["Potion", "Elixir", "Flask", "Oil", "Item Enhancement", "Other Consumable", "Transmutations", "Miscellaneous"],
    "Blacksmithing":  ["Head", "Shoulder", "Chest", "Waist", "Legs", "Feet", "Wrists", "Hands", "Back",
                       "Axes (1H)", "Axes (2H)", "Maces (1H)", "Maces (2H)", "Swords (1H)", "Swords (2H)",
                       "Polearms", "Staves", "Shields", "Parts", "Miscellaneous"],
    "Enchanting":     ["Weapon Enchants", "Shield Enchants", "Head Enchants", "Shoulder Enchants",
                       "Chest Enchants", "Bracer Enchants", "Gloves Enchants", "Legs Enchants",
                       "Boots Enchants", "Cloak Enchants", "Ring Enchants", "Enchants", "Miscellaneous"],
    "Engineering":    ["Head", "Parts", "Devices", "Explosives", "Guns", "Crossbows", "Ammunition",
                       "Quivers & Pouches", "Other Trade Goods", "Miscellaneous"],
    "Jewelcrafting":  ["Red Gems", "Blue Gems", "Yellow Gems", "Orange Gems", "Green Gems", "Purple Gems",
                       "Meta Gems", "Gems", "Jewelry", "Miscellaneous"],
    "Leatherworking": ["Head", "Shoulder", "Chest", "Waist", "Legs", "Feet", "Wrists", "Hands", "Back",
                       "Quivers & Pouches", "Other Trade Goods", "Miscellaneous"],
    "Tailoring":      ["Head", "Shoulder", "Chest", "Waist", "Legs", "Feet", "Wrists", "Hands", "Back",
                       "Bags", "Miscellaneous"],
    "Cooking":        ["Food & Drink", "Miscellaneous"],
    "First Aid":      ["Bandage", "Other Consumable", "Miscellaneous"],
    "Inscription":    ["Recipes", "Other Trade Goods", "Miscellaneous"],
}


def sorted_groups(groups_dict, prof_name):
    order = PROFESSION_GROUP_ORDER.get(prof_name, [])
    ordered = {}
    for group in order:
        if group in groups_dict:
            ordered[group] = groups_dict[group]
    # Append any groups not in the predefined order
    for group in groups_dict:
        if group not in ordered:
            ordered[group] = groups_dict[group]
    # Re-assign sort_order
    for i, key in enumerate(ordered, 1):
        ordered[key]["sort_order"] = i
    return ordered


def main():
    if not os.path.exists(SKILL_MAP_PATH):
        print(f"Error: {SKILL_MAP_PATH} not found.")
        return

    with open(SKILL_MAP_PATH, "r") as f:
        full_skill_map = json.load(f)

    presentation_data = {}

    for skill_id, prof_name in SKILL_LINES.items():
        if skill_id not in full_skill_map:
            continue

        print(f"\nCompiling {prof_name} ({len(full_skill_map[skill_id])} spells)...")
        presentation_data[skill_id] = {
            "profession_name": prof_name,
            "groups": {}
        }
        groups_dict = presentation_data[skill_id]["groups"]

        for idx, spell_id_int in enumerate(full_skill_map[skill_id]):
            html = fetch_html(spell_id_int)
            time.sleep(0.08)  # polite crawl delay

            if html is None:
                print(f"  [{idx}] #{spell_id_int}: fetch failed, skipping")
                continue

            name = extract_spell_name(html, spell_id_int)
            if not name:
                print(f"  [{idx}] #{spell_id_int}: no name found, skipping")
                continue

            # Skip the root profession button spell (e.g. "Alchemy")
            if name.strip() == prof_name:
                continue

            colors = extract_skill_colors(html)
            req_skill = colors[0]  # orange threshold = minimum to learn

            spell_obj = extract_js_object(html, "g_spells", spell_id_int)
            spell_icon = (spell_obj.get("icon", "inv_misc_questionmark") if spell_obj
                          else "inv_misc_questionmark")

            crafted_item = extract_crafted_item(html)
            crafted_icon = crafted_item["icon"] if crafted_item else spell_icon
            crafted_name = crafted_item["name"] if crafted_item else name

            reagents = extract_reagents(html)
            group_name = determine_group(name, crafted_item, prof_name)

            spell_entry = {
                "spell_id":         spell_id_int,
                "name":             name,
                "crafted_name":     crafted_name,
                "req_skill":        req_skill,
                "difficulty":       list(colors),         # [orange, yellow, green, gray]
                "spell_icon":       spell_icon,
                "crafted_icon":     crafted_icon,
                "reagents":         reagents,
            }
            if crafted_item:
                spell_entry["crafted_item_id"] = crafted_item["item_id"]
                spell_entry["req_level"]       = crafted_item["reqlevel"]

            if group_name not in groups_dict:
                groups_dict[group_name] = {
                    "sort_order": len(groups_dict) + 1,
                    "spells": []
                }
            groups_dict[group_name]["spells"].append(spell_entry)

            if (idx + 1) % 10 == 0:
                print(f"  {idx + 1}/{len(full_skill_map[skill_id])} done...")

        # Sort spells within each group by req_skill ascending
        for group in groups_dict.values():
            group["spells"].sort(key=lambda s: s["req_skill"])

        # Apply defined group ordering
        presentation_data[skill_id]["groups"] = sorted_groups(groups_dict, prof_name)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as out:
        json.dump(presentation_data, out, indent=2, ensure_ascii=False)

    print(f"\nDone! Written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()