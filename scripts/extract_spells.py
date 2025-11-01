#!/usr/bin/env python3
"""
WoW 1.12 Spell Extractor - Fully Automated
Extracts spells to optimized array format for website tooltips

Usage: python extract_spells.py
Output: output/spells.json, output/spells.json.gz
"""

import struct
import json
import gzip
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from xml.etree import ElementTree as ET

# ============================================================================
# AUTO-DETECT FIELD INDICES FROM XML
# ============================================================================

def get_spell_loc_indices(xml_path: Path, locale: str = "enUS") -> Dict[str, int]:
    """
    Parse a DBC structure XML (e.g. Classic-definitions.xml) and return
    the starting column indices for localized string blocks in Spell.dbc.
    """
    root = ET.parse(xml_path).getroot()
    spell_table = root.find(".//Table[@Name='Spell']")
    if spell_table is None:
        raise ValueError("Spell table not found in XML definition")

    index = 0
    loc_map = {}
    for field in spell_table.findall("Field"):
        field_type = field.attrib.get("Type", "")
        array_size = int(field.attrib.get("ArraySize", "1"))
        name = field.attrib["Name"]

        if field_type == "loc":
            loc_map[name] = index
            index += 8  # 8 locales (enUS, frFR, deDE, etc.)
        else:
            index += array_size
    return loc_map

# ============================================================================
# CONFIGURATION
# ============================================================================

DBC_PATH = Path('game-data/DBFilesClient')
OUTPUT_DIR = Path('output')
OUTPUT_DIR.mkdir(exist_ok=True)

# Automatically detect localized field indices from Classic-definitions.xml
XML_DEFINITIONS = Path('scripts/Classic-definitions.xml')
LOC_INDICES = get_spell_loc_indices(XML_DEFINITIONS)

# ============================================================================
# LOCALE SETTINGS
# ============================================================================

LOCALE_OFFSET = 0  # Default: 0=enUS, 3=frFR, 4=deDE, 9=ruRU, 10=ptBR, etc.

# Field indices for Spell.dbc (base + localized names from XML)
SPELL_FIELDS = {
    'Id': 0,
    'School': 1,
    'CastingTimeIndex': 18,
    'RecoveryTime': 19,
    'BaseLevel': 28,
    'SpellLevel': 29,
    'MaxLevel': 27,
    'DurationIndex': 30,
    'PowerType': 31,
    'ManaCost': 32,
    'RangeIndex': 36,
    'SpellIconID': 117,
    'Name_enUS': LOC_INDICES.get('Name', 119),
    'NameSubtext_enUS': LOC_INDICES.get('NameSubtext', 128) + 1,
    'Description_enUS': LOC_INDICES.get('Description', 137) + 2,
    'Reagent_1': 42, 'Reagent_2': 43, 'Reagent_3': 44, 'Reagent_4': 45,
    'Reagent_5': 46, 'Reagent_6': 47, 'Reagent_7': 48, 'Reagent_8': 49,
    'ReagentCount_1': 50, 'ReagentCount_2': 51, 'ReagentCount_3': 52, 'ReagentCount_4': 53,
    'ReagentCount_5': 54, 'ReagentCount_6': 55, 'ReagentCount_7': 56, 'ReagentCount_8': 57,
}

# Output schema (must match array order in extract_spell)
SCHEMA = [
    "id", "name", "rank", "icon", "school", "desc",
    "cost", "powerType", "castTime", "cooldown",
    "rangeMin", "rangeMax", "duration",
    "reagents", "minLevel", "spellLevel", "maxLevel"
]

# ============================================================================
# DBC READER
# ============================================================================

class DBCReader:
    """Efficient DBC file reader with string caching"""

    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.records = []
        self.string_block = b''
        self.field_count = 0
        self._string_cache = {}
        self._read_file()

    def _read_file(self):
        """Read DBC binary format"""
        with open(self.file_path, 'rb') as f:
            header = f.read(20)
            magic, record_count, self.field_count, record_size, string_block_size = \
                struct.unpack('<4sIIII', header)

            if magic != b'WDBC':
                raise ValueError(f"Invalid DBC: {self.file_path}")

            for _ in range(record_count):
                record_data = f.read(record_size)
                record = list(struct.unpack(f'<{self.field_count}I', record_data))
                self.records.append(record)

            self.string_block = f.read(string_block_size)

    def get_string(self, offset: int) -> str:
        """Extract string from string block with caching"""
        if offset in self._string_cache:
            return self._string_cache[offset]
        if offset >= len(self.string_block) or offset < 0:
            return ""
        end = self.string_block.find(b'\x00', offset)
        if end == -1:
            return ""
        try:
            result = self.string_block[offset:end].decode('utf-8', errors='ignore')
            self._string_cache[offset] = result
            return result
        except:
            return ""

    def get_float(self, int_value: int) -> float:
        """Convert uint32 to float"""
        return struct.unpack('f', struct.pack('I', int_value))[0]

# ============================================================================
# LOOKUP TABLE BUILDERS
# ============================================================================

def load_spell_icons(dbc_path: Path) -> Dict[int, str]:
    print("Loading SpellIcon.dbc...")
    dbc = DBCReader(dbc_path / 'SpellIcon.dbc')
    icon_map = {}
    for record in dbc.records:
        icon_id = record[0]
        texture_path = dbc.get_string(record[1])
        if texture_path:
            icon_name = texture_path.split('\\')[-1] if '\\' in texture_path else texture_path
            icon_map[icon_id] = icon_name
    print(f"  Loaded {len(icon_map)} icons")
    return icon_map

def load_spell_durations(dbc_path: Path) -> Dict[int, int]:
    print("Loading SpellDuration.dbc...")
    dbc = DBCReader(dbc_path / 'SpellDuration.dbc')
    duration_map = {r[0]: r[1] for r in dbc.records}
    print(f"  Loaded {len(duration_map)} durations")
    return duration_map

def load_spell_cast_times(dbc_path: Path) -> Dict[int, int]:
    print("Loading SpellCastTimes.dbc...")
    dbc = DBCReader(dbc_path / 'SpellCastTimes.dbc')
    cast_map = {r[0]: r[1] for r in dbc.records}
    print(f"  Loaded {len(cast_map)} cast times")
    return cast_map

def load_spell_ranges(dbc_path: Path) -> Dict[int, Tuple[float, float]]:
    print("Loading SpellRange.dbc...")
    dbc = DBCReader(dbc_path / 'SpellRange.dbc')
    range_map = {r[0]: (dbc.get_float(r[1]), dbc.get_float(r[2])) for r in dbc.records}
    print(f"  Loaded {len(range_map)} ranges")
    return range_map

# ============================================================================
# DESCRIPTION PARSER
# ============================================================================

def parse_description(desc: str, duration_ms: int = 0) -> str:
    if not desc:
        return ""
    desc = re.sub(r'\$s1', 'X', desc)
    desc = re.sub(r'\$s2', 'Y', desc)
    desc = re.sub(r'\$s3', 'Z', desc)
    desc = re.sub(r'\$o1', 'X', desc)
    desc = re.sub(r'\$o2', 'Y', desc)
    desc = re.sub(r'\$o3', 'Z', desc)
    if duration_ms > 0:
        duration_sec = duration_ms / 1000
        desc = re.sub(r'\$d', f'{duration_sec:.0f} sec', desc)
    else:
        desc = re.sub(r'\$d', 'Z sec', desc)
    desc = re.sub(r'\$\w+', 'X', desc)
    return desc.strip()

# ============================================================================
# LOCALE DETECTION
# ============================================================================

def detect_locale_offset(spell_dbc: DBCReader, loc_index: int) -> int:
    """
    Scan multiple records to detect which locale slot likely contains English (enUS).
    Returns the offset 0–15 to add within the localized field block.
    """
    # basic ASCII/vowel heuristics
    vowel_re = re.compile(r'[aeiouAEIOU]')
    letter_re = re.compile(r'^[\x20-\x7E]+$')  # mostly ASCII
    sample_count = min(200, len(spell_dbc.records))  # check first 200 spells

    scores = [0] * 8
    for record in spell_dbc.records[:sample_count]:
        for off in range(8):
            try:
                text = spell_dbc.get_string(record[loc_index + off])
            except Exception:
                continue
            if not text or len(text) < 3:
                continue
            # Heuristic: English text is ASCII, has vowels, no Cyrillic or accents
            if letter_re.match(text) and vowel_re.search(text):
                scores[off] += 1

    best_off = max(range(8), key=lambda i: scores[i])
    total = sum(scores)
    confidence = (scores[best_off] / total * 100) if total else 0
    print(f"  Locale detection: slot {best_off} scored {scores[best_off]} / {total} ({confidence:.1f}% confidence)")
    return best_off

# ============================================================================
# SPELL EXTRACTOR
# ============================================================================

def should_skip_spell(name: str) -> bool:
    skip_keywords = ['(OLD)', 'TEST', 'NYI', 'DND', 'QA', 'UNUSED', 'DEPRECATED', 'DEATHKNIGHT']
    return any(keyword in name.upper() for keyword in skip_keywords)

def extract_spell(record: List[int], spell_dbc: DBCReader,
                  icon_map: Dict, duration_map: Dict,
                  cast_time_map: Dict, range_map: Dict) -> Optional[List]:
    spell_id = record[SPELL_FIELDS['Id']]

    name = spell_dbc.get_string(record[SPELL_FIELDS['Name_enUS'] + LOCALE_OFFSET]) or ""
    rank_raw = spell_dbc.get_string(record[SPELL_FIELDS['NameSubtext_enUS'] + LOCALE_OFFSET])
    rank = rank_raw if rank_raw else None

    icon_id = record[SPELL_FIELDS['SpellIconID']]
    icon = icon_map.get(icon_id, 'INV_Misc_QuestionMark')
    school = record[SPELL_FIELDS['School']]

    desc_raw = spell_dbc.get_string(record[SPELL_FIELDS['Description_enUS'] + LOCALE_OFFSET])
    duration_id = record[SPELL_FIELDS['DurationIndex']]
    duration_ms = duration_map.get(duration_id, 0)
    desc = parse_description(desc_raw, duration_ms)

    cost = record[SPELL_FIELDS['ManaCost']]
    power_type = record[SPELL_FIELDS['PowerType']]
    cast_time_id = record[SPELL_FIELDS['CastingTimeIndex']]
    cast_time = cast_time_map.get(cast_time_id, 0)
    cooldown = record[SPELL_FIELDS['RecoveryTime']]

    range_id = record[SPELL_FIELDS['RangeIndex']]
    range_min, range_max = range_map.get(range_id, (0, 0))

    reagents = []
    for i in range(1, 9):
        reagent_id = record[SPELL_FIELDS[f'Reagent_{i}']]
        reagent_count = record[SPELL_FIELDS[f'ReagentCount_{i}']]
        if reagent_id > 0:
            reagents.append([reagent_id, reagent_count])
    reagents = reagents if reagents else None

    min_level = record[SPELL_FIELDS['BaseLevel']]
    spell_level = record[SPELL_FIELDS['SpellLevel']]
    max_level = record[SPELL_FIELDS['MaxLevel']]

    return [
        spell_id, name, rank, icon, school, desc,
        cost, power_type, cast_time, cooldown,
        range_min, range_max, duration_ms,
        reagents, min_level, spell_level, max_level
    ]

# ============================================================================
# MAIN
# ============================================================================

def main():
    global LOCALE_OFFSET
    print("="*80)
    print("WoW 1.12 Spell Extractor")
    print("="*80)

    icon_map = load_spell_icons(DBC_PATH)
    duration_map = load_spell_durations(DBC_PATH)
    cast_time_map = load_spell_cast_times(DBC_PATH)
    range_map = load_spell_ranges(DBC_PATH)

    print("\nLoading Spell.dbc...")
    spell_dbc = DBCReader(DBC_PATH / 'Spell.dbc')
    print(f"  Loaded {len(spell_dbc.records)} spells")

    name_loc_index = SPELL_FIELDS['Name_enUS']
    detected_offset = detect_locale_offset(spell_dbc, name_loc_index)
    if detected_offset != LOCALE_OFFSET:
        print(f"  Detected LOCALE_OFFSET = {detected_offset} (was {LOCALE_OFFSET})")
    LOCALE_OFFSET = detected_offset

    print("\nExtracting spells...")
    spells, skipped = [], 0
    for record in spell_dbc.records:
        spell_array = extract_spell(record, spell_dbc, icon_map,
                                    duration_map, cast_time_map, range_map)
        if spell_array:
            spells.append(spell_array)
        else:
            skipped += 1

    print(f"  Extracted: {len(spells)} spells")
    print(f"  Skipped: {skipped} spells (OLD/TEST/invalid)")

    output = {
        "version": "1.12.1",
        "extracted": datetime.now().isoformat(),
        "schema": SCHEMA,
        "spells": spells
    }

    output_file = OUTPUT_DIR / 'spells.json'
    print(f"\nWriting {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, separators=(',', ':'), ensure_ascii=False)
    size_mb = output_file.stat().st_size / 1024 / 1024
    print(f"  Size: {size_mb:.2f} MB")

    output_gz = OUTPUT_DIR / 'spells.json.gz'
    print(f"\nWriting {output_gz}...")
    with gzip.open(output_gz, 'wt', encoding='utf-8') as f:
        json.dump(output, f, separators=(',', ':'), ensure_ascii=False)
    size_gz_mb = output_gz.stat().st_size / 1024 / 1024
    print(f"  Size: {size_gz_mb:.2f} MB")
    print(f"  Compression: {(1 - size_gz_mb/size_mb)*100:.1f}%")

    print("\n" + "="*80)
    print("✓ Extraction complete!")
    print(f"✓ Ready to deploy: {output_gz}")
    print("="*80)

    # Diagnostic: check first record field alignment
    print("\n=== Locale field diagnostics (first record) ===")
    first = spell_dbc.records[0]
    for block_name in ["Name", "NameSubtext", "Description"]:
        base = LOC_INDICES[block_name]
        print(f"\n{block_name}:")
        for i in range(8):
            val = spell_dbc.get_string(first[base + i])
            print(f"  slot {i}: {val[:60]}")

    # === Focus test on spell ID 2 ===
    print("\n=== Field validation: ID 2 (Illusion: Forest Dryad) ===")
    for record in spell_dbc.records:
        if record[0] == 2:
            for block_name in ["Name", "NameSubtext", "Description"]:
                base = LOC_INDICES[block_name]
                print(f"\n{block_name}:")
                for i in range(8):
                    val = spell_dbc.get_string(record[base + i])
                    print(f"  slot {i}: {val[:80]}")
            break

    print("\nSample spells:")
    for spell in spells[:5]:
        print(f"  {spell[0]:5d}: {spell[1]}")
        if spell[2]:
            print(f"         Rank: {spell[2]}")
        print(f"         Icon: {spell[3]}")
        print(f"         Desc: {spell[5][:60]}...")

if __name__ == "__main__":
    main()
