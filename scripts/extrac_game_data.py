#!/usr/bin/env python3
"""
Extract spells and items from WoW 1.12 DBC files
Based on analysis of multi-language DBC structure
"""
import struct
import json
from pathlib import Path
from typing import Dict, List, Optional

class DBCReader:
    """Read WoW 1.12 DBC files"""
    
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.records = []
        self.string_block = b''
        self.field_count = 0
        self.record_size = 0
        self.record_count = 0
        self._read_file()
    
    def _read_file(self):
        """Read the DBC file structure"""
        with open(self.file_path, 'rb') as f:
            # Read header
            header = f.read(20)
            magic, record_count, field_count, record_size, string_block_size = \
                struct.unpack('<4sIIII', header)
            
            if magic != b'WDBC':
                raise ValueError(f"Not a valid DBC file: {self.file_path}")
            
            self.field_count = field_count
            self.record_size = record_size
            self.record_count = record_count
            
            print(f"Reading {self.file_path.name}:")
            print(f"  Records: {record_count}, Fields: {field_count}, "
                  f"Record size: {record_size} bytes")
            
            # Read all records as uint32 fields
            for i in range(record_count):
                record_data = f.read(record_size)
                if len(record_data) != record_size:
                    break
                
                record = []
                for j in range(field_count):
                    offset = j * 4
                    if offset + 4 <= len(record_data):
                        value = struct.unpack('<I', record_data[offset:offset+4])[0]
                        record.append(value)
                    else:
                        record.append(0)
                
                self.records.append(record)
            
            # Read string block
            self.string_block = f.read(string_block_size)
            print(f"  String block: {len(self.string_block)} bytes")
    
    def get_string(self, offset: int) -> str:
        """Extract null-terminated string from string block"""
        if offset >= len(self.string_block):
            return ""
        
        end = self.string_block.find(b'\x00', offset)
        if end == -1:
            return ""
        
        try:
            return self.string_block[offset:end].decode('utf-8', errors='ignore')
        except:
            return ""
    
    def get_localized_string(self, record: List[int], start_field: int, 
                            locale_index: int = 0) -> str:
        """
        Extract localized string from record.
        
        For 1.12 vanilla:
        - start_field: First field of localized string block
        - locale_index: 0=enUS, 1=koKR, 2=frFR, 3=deDE, 4=zhCN, 
                       5=zhTW, 6=esES, 7=esMX
        """
        field_idx = start_field + locale_index
        if field_idx < len(record):
            return self.get_string(record[field_idx])
        return ""


def extract_spell_icons(dbc_path: Path) -> Dict[int, str]:
    """Extract SpellIcon.dbc mapping"""
    print("\n" + "="*80)
    print("Extracting Spell Icons")
    print("="*80)
    
    icon_file = dbc_path / 'SpellIcon.dbc'
    if not icon_file.exists():
        print(f"WARNING: {icon_file} not found")
        return {}
    
    dbc = DBCReader(icon_file)
    icon_map = {}
    
    for record in dbc.records:
        icon_id = record[0]  # Field 0: ID
        texture_path = dbc.get_string(record[1])  # Field 1: texture path
        
        if texture_path:
            # Extract just the icon name
            icon_name = texture_path.split('\\')[-1] if '\\' in texture_path else texture_path
            icon_map[icon_id] = icon_name
    
    print(f"Extracted {len(icon_map)} icon mappings")
    return icon_map


def extract_spells(dbc_path: Path, icon_map: Dict[int, str]) -> Dict[str, dict]:
    """
    Extract spells from Spell.dbc
    
    Based on wowdev.wiki Spell.dbc structure for 1.12:
    - Field 0: ID
    - Fields 120-128: Name (localized, enUS is field 120)
    - Fields 133-141: Rank/NameSubtext (localized)
    - Field 121: SpellIcon ID (spellbook)
    - Field 122: SpellIcon ID (target/buff bar)
    """
    print("\n" + "="*80)
    print("Extracting Spells")
    print("="*80)
    
    spell_file = dbc_path / 'Spell.dbc'
    if not spell_file.exists():
        print(f"ERROR: {spell_file} not found")
        return {}
    
    dbc = DBCReader(spell_file)
    spells = {}
    
    # Track problematic spells
    no_name_count = 0
    non_english_count = 0
    
    for record in dbc.records:
        spell_id = record[0]
        
        # Skip invalid IDs
        if spell_id == 0 or spell_id > 100000:
            continue
        
        # Get English name (field 120 based on wowdev docs)
        name = dbc.get_localized_string(record, 120, locale_index=0)
        
        # Get rank/subtext
        rank = dbc.get_localized_string(record, 133, locale_index=0)
        
        # Skip if no name
        if not name or len(name) < 2:
            no_name_count += 1
            continue
        
        # Check if name looks non-English (has high unicode chars)
        if any(ord(c) > 127 for c in name):
            non_english_count += 1
            # Try other fields that might have English
            for test_field in [124, 127, 128, 36, 82]:
                alt_name = dbc.get_string(record[test_field]) if test_field < len(record) else ""
                if alt_name and len(alt_name) > 2 and not any(ord(c) > 127 for c in alt_name):
                    name = alt_name
                    break
        
        # Skip OLD spells and test spells
        if '(OLD)' in name or 'Test' in name or 'QA' in name:
            continue
        
        # Get icon IDs
        icon_spellbook = record[121] if len(record) > 121 else 0
        icon_target = record[122] if len(record) > 122 else 0
        
        # Prefer target icon, fallback to spellbook icon
        icon_id = icon_target if icon_target in icon_map else icon_spellbook
        
        spells[str(spell_id)] = {
            'id': spell_id,
            'name': name.strip(),
            'rank': rank.strip() if rank else None,
            'icon_id': icon_id,
            'icon_name': icon_map.get(icon_id)
        }
    
    print(f"Extracted {len(spells)} spells")
    if no_name_count:
        print(f"  Skipped {no_name_count} spells with no name")
    if non_english_count:
        print(f"  Found {non_english_count} non-English names (attempted fixes)")
    
    return spells


def extract_item_display_info(dbc_path: Path) -> Dict[int, str]:
    """Extract ItemDisplayInfo.dbc for icon mappings"""
    print("\n" + "="*80)
    print("Extracting Item Display Info")
    print("="*80)
    
    display_file = dbc_path / 'ItemDisplayInfo.dbc'
    if not display_file.exists():
        print(f"WARNING: {display_file} not found")
        return {}
    
    dbc = DBCReader(display_file)
    display_map = {}
    
    for record in dbc.records:
        display_id = record[0]  # Field 0: ID
        icon_path = dbc.get_string(record[5])  # Field 5: Icon path (INV_*)
        
        if icon_path:
            # Extract just the icon name
            icon_name = icon_path.split('\\')[-1] if '\\' in icon_path else icon_path
            display_map[display_id] = icon_name
    
    print(f"Extracted {len(display_map)} display info mappings")
    return display_map


def save_json(data: dict, output_file: Path):
    """Save data to JSON file with pretty formatting"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, sort_keys=True)
    print(f"\nSaved to: {output_file}")
    print(f"  Total entries: {len(data)}")


def show_samples(data: dict, title: str, count: int = 10):
    """Show sample entries"""
    print(f"\n{title} (showing first {count}):")
    for i, (key, value) in enumerate(list(data.items())[:count], 1):
        if isinstance(value, dict):
            name = value.get('name', 'Unknown')
            icon = value.get('icon_name', 'none')
            print(f"  {i:2d}. {key:6s}: {name:40s} [{icon}]")
        else:
            print(f"  {i:2d}. {key}: {value}")


def main():
    """Main extraction process"""
    print("="*80)
    print("WoW 1.12 DBC Data Extractor")
    print("="*80)
    
    # Setup paths
    dbc_path = Path('game-data/DBFilesClient/')
    if not dbc_path.exists():
        print(f"\nERROR: Directory not found: {dbc_path}")
        print("Please ensure the game-data symlink is set up correctly")
        return
    
    # Extract icon mappings
    icon_map = extract_spell_icons(dbc_path)
    
    # Extract spells
    spells = extract_spells(dbc_path, icon_map)
    if spells:
        save_json(spells, Path('spells.json'))
        show_samples(spells, "Sample Spells")
    
    # Extract item display info (for future item extraction)
    display_map = extract_item_display_info(dbc_path)
    if display_map:
        save_json(display_map, Path('item_display_info.json'))
        show_samples(display_map, "Sample Item Display Info")
    
    print("\n" + "="*80)
    print("Extraction Complete!")
    print("="*80)
    print("\nNext steps:")
    print("1. Review spells.json for data quality")
    print("2. Check if English names are correct")
    print("3. If many names are wrong, you may need to:")
    print("   - Re-extract DBC files from enUS MPQ archives")
    print("   - Use MPQEditor to extract from locale-specific MPQs")


if __name__ == "__main__":
    main()