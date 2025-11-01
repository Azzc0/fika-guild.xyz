#!/usr/bin/env python3
"""
Debug SpellIcon.dbc mapping
"""

import struct
from pathlib import Path

class DBCReader:
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.records = []
        self.string_block = b''
        self.field_count = 0
        self._read_file()

    def _read_file(self):
        with open(self.file_path, 'rb') as f:
            header = f.read(20)
            magic, record_count, self.field_count, record_size, string_block_size = struct.unpack('<4sIIII', header)
            
            if magic != b'WDBC':
                raise ValueError(f"Invalid DBC: {self.file_path}")

            for _ in range(record_count):
                record_data = f.read(record_size)
                record = list(struct.unpack(f'<{self.field_count}I', record_data))
                self.records.append(record)

            self.string_block = f.read(string_block_size)

    def get_string(self, offset: int) -> str:
        if offset < len(self.string_block):
            end = self.string_block.find(b'\x00', offset)
            if end == -1:
                return ""
            return self.string_block[offset:end].decode('utf-8', errors='ignore')
        return ""

def debug_icon_mapping():
    """Debug the icon mapping between Spell.dbc and SpellIcon.dbc"""
    spell_dbc = DBCReader(Path('game-data/DBFilesClient/Spell.dbc'))
    icon_dbc = DBCReader(Path('game-data/DBFilesClient/SpellIcon.dbc'))
    
    print("🔍 Debugging SpellIcon.dbc mapping...")
    print(f"SpellIcon.dbc has {len(icon_dbc.records)} records")
    
    # Build the icon map exactly like in extract_spells.py
    icon_map = {}
    for record in icon_dbc.records:
        icon_id = record[0]
        texture_path = icon_dbc.get_string(record[1])
        if texture_path:
            icon_name = texture_path.split('\\')[-1] if '\\' in texture_path else texture_path
            icon_map[icon_id] = icon_name
    
    print(f"Built icon map with {len(icon_map)} entries")
    
    # Test with known spells
    test_spells = [
        (53, "Backstab", 243),  # icon ID 243
        (133, "Fireball", 185), # icon ID 185  
        (686, "Shadow Bolt", 213), # icon ID 213
    ]
    
    print("\n=== Testing icon lookup ===")
    for spell_id, expected_name, expected_icon_id in test_spells:
        # Find the spell record
        for record in spell_dbc.records:
            if record[0] == spell_id:
                actual_icon_id = record[117]  # From our debug finding
                icon_name = icon_map.get(actual_icon_id, "NOT_FOUND")
                
                print(f"\nSpell: {expected_name} (ID: {spell_id})")
                print(f"  Spell.dbc Icon ID: {actual_icon_id}")
                print(f"  Expected Icon ID: {expected_icon_id}")
                print(f"  Lookup result: '{icon_name}'")
                print(f"  Match: {actual_icon_id == expected_icon_id}")
                
                # Check if this icon ID exists in SpellIcon.dbc
                if actual_icon_id not in icon_map:
                    print(f"  ❌ Icon ID {actual_icon_id} not found in SpellIcon.dbc!")
                    # Let's see what icon IDs are around this one
                    nearby_ids = [id for id in range(actual_icon_id-2, actual_icon_id+3) if id in icon_map]
                    print(f"  Nearby available icon IDs: {nearby_ids}")
                break

    # Let's also check what the first 20 icons in SpellIcon.dbc look like
    print("\n=== First 20 entries in SpellIcon.dbc ===")
    for i, record in enumerate(icon_dbc.records[:20]):
        icon_id = record[0]
        texture_path = icon_dbc.get_string(record[1])
        icon_name = texture_path.split('\\')[-1] if '\\' in texture_path else texture_path
        print(f"  {icon_id:4} -> {icon_name}")

if __name__ == "__main__":
    debug_icon_mapping()