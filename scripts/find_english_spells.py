# find_english_spells.py
import struct
import os
import json
from pathlib import Path

class DBCReader:
    def __init__(self, file_path):
        self.file_path = file_path
        self.records = []
        self.string_block = b''
        self.field_count = 0
        self.record_size = 0
        self.read_file()
    
    def read_file(self):
        """Read and parse DBC file"""
        with open(self.file_path, 'rb') as f:
            header = f.read(20)
            magic, record_count, field_count, record_size, string_block_size = struct.unpack('<4sIIII', header)
            
            if magic != b'WDBC':
                raise ValueError(f"Not a valid DBC file: {self.file_path}")
            
            self.field_count = field_count
            self.record_size = record_size
            
            # Read all records
            for i in range(record_count):
                record_data = f.read(record_size)
                if len(record_data) != record_size:
                    break
                
                record = []
                for j in range(field_count):
                    start = j * 4
                    end = start + 4
                    if end <= len(record_data):
                        field_bytes = record_data[start:end]
                        value = struct.unpack('<I', field_bytes)[0]
                        record.append(value)
                    else:
                        record.append(0)
                
                self.records.append(record)
            
            # Read string block
            self.string_block = f.read(string_block_size)
    
    def get_string(self, offset):
        """Get string from string block by offset"""
        if offset < len(self.string_block):
            end = self.string_block.find(b'\x00', offset)
            if end != -1:
                return self.string_block[offset:end].decode('utf-8', errors='ignore')
        return ""

def find_english_spell_names():
    """Find English spell names by looking for ASCII text patterns"""
    dbc_path = 'game-data/DBFilesClient/Spell.dbc'
    spell_dbc = DBCReader(dbc_path)
    
    print("=== Searching for English spell names ===")
    
    # Common English spell words
    english_keywords = [
        'Fireball', 'Frostbolt', 'Shadow Bolt', 'Healing', 'Lightning',
        'Arcane', 'Pyroblast', 'Cleave', 'Cleanse', 'Strike', 'Smite',
        'Shield', 'Armor', 'Wave', 'Bolt', 'Blast', 'Nova', 'Word',
        'Curse', 'Blessing', 'Prayer', 'Conjure', 'Summon', 'Teleport'
    ]
    
    found_spells = {}
    
    # Scan the entire string block for English spell names
    print("Scanning string block for English text...")
    
    # Look for ASCII text patterns in the string block
    current_string = ""
    in_english_string = False
    
    for i, byte in enumerate(spell_dbc.string_block):
        if 32 <= byte <= 126:  # ASCII printable characters
            current_string += chr(byte)
            in_english_string = True
        else:
            if in_english_string and len(current_string) > 10:
                # Check if this looks like a spell name
                if any(keyword.lower() in current_string.lower() for keyword in english_keywords):
                    # Check if it's mostly English (not mixed with other scripts)
                    english_chars = sum(1 for c in current_string if ord(c) < 128)
                    if english_chars / len(current_string) > 0.8:  # 80% English
                        if current_string not in found_spells.values():
                            # Find which record uses this string
                            for record_idx, record in enumerate(spell_dbc.records):
                                for field_idx, value in enumerate(record):
                                    if value == i - len(current_string):
                                        found_spells[record[0]] = current_string
                                        print(f"Spell ID {record[0]}: '{current_string}' (Record {record_idx}, Field {field_idx})")
                                        break
                                if record[0] in found_spells:
                                    break
            current_string = ""
            in_english_string = False
    
    print(f"\nFound {len(found_spells)} English spell names")
    return found_spells

def check_multilingual_structure():
    """Check if the DBC file has multiple language versions"""
    dbc_path = 'game-data/DBFilesClient/Spell.dbc'
    spell_dbc = DBCReader(dbc_path)
    
    print("\n=== Analyzing multilingual structure ===")
    
    # Known spell IDs and what fields might contain different languages
    test_spell_ids = [133, 116, 686, 331, 403]
    
    for spell_id in test_spell_ids:
        for record in spell_dbc.records:
            if record[0] == spell_id:
                print(f"\nSpell ID {spell_id}:")
                
                # Check multiple string fields
                for field_idx in range(50):
                    string_val = spell_dbc.get_string(record[field_idx])
                    if string_val and len(string_val) > 3:
                        # Try to detect language
                        if all(ord(c) < 128 for c in string_val):
                            lang = "English/Latin"
                        elif any(ord(c) > 127 for c in string_val):
                            # Could be Russian, Chinese, etc.
                            lang = "Non-English"
                        else:
                            lang = "Unknown"
                        
                        print(f"  Field {field_idx}: '{string_val[:30]}...' ({lang})")
                
                break

def extract_spells_by_icon():
    """Extract spells by finding records with valid icon IDs"""
    dbc_path = 'game-data/DBFilesClient/Spell.dbc'
    spell_dbc = DBCReader(dbc_path)
    
    print("\n=== Extracting spells with valid icons ===")
    
    # Load icon mapping
    icon_dbc_path = 'game-data/DBFilesClient/SpellIcon.dbc'
    icon_dbc = DBCReader(icon_dbc_path)
    
    icon_mapping = {}
    for record in icon_dbc.records:
        icon_id = record[0]
        texture_path = icon_dbc.get_string(record[1])
        if texture_path:
            icon_name = texture_path.split('\\')[-1] if '\\' in texture_path else texture_path
            icon_mapping[icon_id] = icon_name
    
    print(f"Loaded {len(icon_mapping)} icon mappings")
    
    # Find spells with valid icons
    spells_with_icons = {}
    
    for record in spell_dbc.records:
        spell_id = record[0]
        # Try different possible icon field positions
        icon_fields = [21, 22, 23, 24, 25]  # Common icon field positions
        
        for icon_field in icon_fields:
            if icon_field < len(record):
                icon_id = record[icon_field]
                if icon_id in icon_mapping and icon_id != 0:
                    # This record has a valid icon, try to find its name
                    spells_with_icons[spell_id] = {
                        'icon_id': icon_id,
                        'icon_name': icon_mapping[icon_id],
                        'icon_field': icon_field
                    }
                    break
    
    print(f"Found {len(spells_with_icons)} spells with valid icons")
    
    # Show some examples
    print("\nExample spells with icons:")
    for spell_id, data in list(spells_with_icons.items())[:10]:
        print(f"  Spell ID {spell_id}: Icon '{data['icon_name']}' (Field {data['icon_field']})")
    
    return spells_with_icons

def try_different_client_data():
    """Suggest checking for English client data"""
    print("\n=== IMPORTANT: Language Issue Detected ===")
    print("The Spell.dbc file appears to contain non-English text (Russian, Chinese, Spanish, etc.)")
    print("This suggests you're working with a non-English client version.")
    print("\nPossible solutions:")
    print("1. Extract DBC files from an English WoW client")
    print("2. Look for English-specific DBC files (might be in a different location)")
    print("3. Use a different field mapping that accounts for multiple languages")
    print("\nCommon multilingual DBC structure:")
    print("  - Field 1: English name")
    print("  - Field 2: French name") 
    print("  - Field 3: German name")
    print("  - Field 4: Chinese name")
    print("  - etc...")

if __name__ == "__main__":
    find_english_spell_names()
    check_multilingual_structure()
    spells_with_icons = extract_spells_by_icon()
    try_different_client_data()