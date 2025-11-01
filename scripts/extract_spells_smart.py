# extract_spells_smart.py
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
            
            self.string_block = f.read(string_block_size)
    
    def get_string(self, offset):
        if offset < len(self.string_block):
            end = self.string_block.find(b'\x00', offset)
            if end != -1:
                return self.string_block[offset:end].decode('utf-8', errors='ignore')
        return ""

def load_or_create_json(file_path, default=None):
    """Load existing JSON or create with default"""
    if file_path.exists():
        with open(file_path, 'r') as f:
            return json.load(f)
    return default if default is not None else {}

def save_json(data, file_path):
    """Save data to JSON file"""
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def extract_spell_icons():
    """Extract icon mappings - run this once"""
    dbc_path = Path('game-data/DBFilesClient/')
    icon_dbc = DBCReader(str(dbc_path / 'SpellIcon.dbc'))
    
    icon_mapping = {}
    for record in icon_dbc.records:
        icon_id = record[0]
        texture_path = icon_dbc.get_string(record[1])
        if texture_path:
            icon_name = texture_path.split('\\')[-1] if '\\' in texture_path else texture_path
            icon_mapping[icon_id] = icon_name
    
    return icon_mapping

def find_best_spell_name(record, spell_dbc):
    """Find the best available name for a spell across multiple language fields"""
    # Try different field combinations for English names
    test_fields = [
        (1, "English"), (4, "English"), (28, "English"), (29, "English"),
        (127, "English"), (36, "English"), (82, "English")
    ]
    
    for field_idx, lang in test_fields:
        if field_idx < len(record):
            name = spell_dbc.get_string(record[field_idx])
            if name and len(name) > 3:
                # Check if it looks like a real spell name (not partial)
                if not name.startswith(' ') and not name.endswith('(OLD)') and ' of Recall' not in name:
                    return name
    
    # Fallback: return any non-OLD name
    for field_idx in range(min(50, len(record))):
        name = spell_dbc.get_string(record[field_idx])
        if name and len(name) > 3 and '(OLD)' not in name and ' of Recall' not in name:
            return name
    
    return "Unknown Spell"

def update_spell_data():
    """Main function to update spell data incrementally"""
    dbc_path = Path('game-data/DBFilesClient/')
    
    # Load existing data or create empty
    spells_file = Path('spells.json')
    spells_data = load_or_create_json(spells_file, {})
    
    # Load icon mapping
    icon_mapping_file = Path('icon_mapping.json')
    icon_mapping = load_or_create_json(icon_mapping_file)
    if not icon_mapping:
        print("Extracting icon mappings...")
        icon_mapping = extract_spell_icons()
        save_json(icon_mapping, icon_mapping_file)
        print(f"Saved {len(icon_mapping)} icon mappings")
    
    # Read spell DBC
    print("Reading Spell.dbc...")
    spell_dbc = DBCReader(str(dbc_path / 'Spell.dbc'))
    
    # Update spells
    updated_count = 0
    new_count = 0
    
    for record in spell_dbc.records:
        spell_id = record[0]
        
        # Skip invalid IDs
        if spell_id == 0 or spell_id > 100000:
            continue
        
        # Get spell name
        spell_name = find_best_spell_name(record, spell_dbc)
        
        # Get icon ID (try common fields)
        icon_id = 0
        for icon_field in [21, 22, 23, 24, 25]:
            if icon_field < len(record):
                if record[icon_field] in icon_mapping:
                    icon_id = record[icon_field]
                    break
        
        # Create/update spell data
        spell_key = str(spell_id)
        if spell_key in spells_data:
            # Update existing
            if spells_data[spell_key].get('name') != spell_name:
                spells_data[spell_key]['name'] = spell_name
                spells_data[spell_key]['icon_id'] = icon_id
                spells_data[spell_key]['icon_name'] = icon_mapping.get(icon_id)
                updated_count += 1
        else:
            # Add new
            spells_data[spell_key] = {
                'id': spell_id,
                'name': spell_name,
                'icon_id': icon_id,
                'icon_name': icon_mapping.get(icon_id)
            }
            new_count += 1
    
    # Save updated data
    save_json(spells_data, spells_file)
    
    print(f"Spell data updated: {new_count} new, {updated_count} updated")
    print(f"Total spells: {len(spells_data)}")
    
    # Show some examples
    print("\nExample spells:")
    for spell_id, spell in list(spells_data.items())[:10]:
        print(f"  {spell_id}: {spell.get('name', 'Unknown')}")

def check_mpq_sources():
    """Check if we can find better MPQ sources for English data"""
    print("\n=== MPQ Source Analysis ===")
    print("Current issue: Non-English spell names in DBC")
    print("\nTo get English data, extract from these MPQ files:")
    print("  - enUS/realmlist.wtf (check client locale)")
    print("  - base-enUS.MPQ or patch-enUS.MPQ")
    print("  - Look for MPQs with 'enUS' in the filename")
    print("\nIn MPQEditor, don't use 'Merge View' - extract from specific locale MPQs")

if __name__ == "__main__":
    update_spell_data()
    check_mpq_sources()