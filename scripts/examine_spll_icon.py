#!/usr/bin/env python3
"""
Debug script to find SpellIconID field
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

def find_spell_icon_field():
    """Find which field contains the SpellIconID"""
    spell_dbc = DBCReader(Path('game-data/DBFilesClient/Spell.dbc'))
    icon_dbc = DBCReader(Path('game-data/DBFilesClient/SpellIcon.dbc'))
    
    # Create icon map for verification
    icon_map = {}
    for record in icon_dbc.records:
        icon_id = record[0]
        texture_path = icon_dbc.get_string(record[1])
        if texture_path:
            icon_name = texture_path.split('\\')[-1] if '\\' in texture_path else texture_path
            icon_map[icon_id] = icon_name
    
    print(f"Loaded {len(icon_map)} icons from SpellIcon.dbc")
    
    # Test with known spells and their expected icons
    test_spells = [
        (53, "Backstab", "Ability_BackStab"),  # Should be icon ID 3
        (133, "Fireball", "Spell_Fire_FlameBolt"),  # Should be icon ID 6
        (686, "Shadow Bolt", "Spell_Shadow_ShadowBolt"),  # Should be icon ID 17
    ]
    
    print("\n🔍 Searching for SpellIconID field...")
    
    for spell_id, expected_name, expected_icon in test_spells:
        # Find the spell record
        for record in spell_dbc.records:
            if record[0] == spell_id:
                print(f"\n=== Spell ID {spell_id}: {expected_name} ===")
                print(f"Expected icon: {expected_icon}")
                
                # Check fields around where we think SpellIconID should be
                for field_idx in range(110, 130):  # Check a range
                    icon_id = record[field_idx]
                    if icon_id in icon_map:
                        icon_name = icon_map[icon_id]
                        if expected_icon.lower() in icon_name.lower():
                            print(f"🎯 FOUND! Field {field_idx}: {icon_id} -> {icon_name}")
                        else:
                            print(f"  Field {field_idx}: {icon_id} -> {icon_name}")
                break

if __name__ == "__main__":
    find_spell_icon_field()