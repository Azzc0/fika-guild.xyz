# explore_spells_proper.py
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
            # Read and parse header (20 bytes)
            header = f.read(20)
            if len(header) < 20:
                raise ValueError(f"File too small: {self.file_path}")
            
            # Header structure: magic, record_count, field_count, record_size, string_block_size
            magic, record_count, field_count, record_size, string_block_size = struct.unpack('<4sIIII', header)
            
            if magic != b'WDBC':
                raise ValueError(f"Not a valid DBC file: {self.file_path}")
            
            self.field_count = field_count
            self.record_size = record_size
            
            print(f"Reading {record_count} records, {field_count} fields, record size: {record_size}")
            
            # Read all records
            for i in range(record_count):
                record_data = f.read(record_size)
                if len(record_data) != record_size:
                    print(f"Warning: Record {i} truncated")
                    break
                
                # Parse record into fields (assuming 4-byte fields)
                record = []
                for j in range(field_count):
                    start = j * 4
                    end = start + 4
                    if end <= len(record_data):
                        field_bytes = record_data[start:end]
                        value = struct.unpack('<I', field_bytes)[0]  # Unsigned int
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

def find_real_spells():
    """Find actual spells in the DBC file by scanning for known spell names"""
    dbc_path = 'game-data/DBFilesClient/Spell.dbc'
    spell_dbc = DBCReader(dbc_path)
    
    # Known spell IDs and their expected names
    known_spells = {
        133: "Fireball",
        116: "Frostbolt", 
        686: "Shadow Bolt",
        1180: "Daggers",
        168: "Frost Armor",
        205: "Frostbolt",
        331: "Healing Wave",
        403: "Lightning Bolt",
        11681: "Hellfire",
        11366: "Pyroblast",
        50796: "Cleave",
        4987: "Cleanse"
    }
    
    print("=== Searching for known spells by ID ===")
    
    found_count = 0
    for expected_id, expected_name in known_spells.items():
        found = False
        for record in spell_dbc.records:
            if record[0] == expected_id:
                print(f"✓ FOUND Spell ID {expected_id}")
                print(f"  First 15 fields: {record[:15]}")
                
                # Check all fields for strings that might be the name
                for field_idx in range(min(50, len(record))):
                    string_val = spell_dbc.get_string(record[field_idx])
                    if string_val and len(string_val) > 3:
                        print(f"    Field {field_idx}: '{string_val}'")
                
                found_count += 1
                break
        else:
            print(f"✗ ID {expected_id} not found in DBC")
    
    print(f"\nFound {found_count}/{len(known_spells)} known spell IDs")

def scan_for_spell_names():
    """Scan through the entire file looking for spell-like names"""
    dbc_path = 'game-data/DBFilesClient/Spell.dbc'
    spell_dbc = DBCReader(dbc_path)
    
    print("\n=== Scanning for spell names in entire file ===")
    
    spell_keywords = ['fireball', 'frostbolt', 'shadow bolt', 'healing', 'lightning', 'arcane', 'pyroblast']
    found_examples = []
    
    # Check different sections of the file
    check_points = [
        (0, 100, "Beginning"),
        (1000, 1100, "Early"),
        (10000, 10100, "Middle"), 
        (20000, 20100, "Late"),
        (len(spell_dbc.records) - 100, len(spell_dbc.records), "End")
    ]
    
    for start, end, section_name in check_points:
        print(f"\n--- {section_name} section (records {start}-{end}) ---")
        section_found = []
        
        for i in range(start, min(end, len(spell_dbc.records))):
            record = spell_dbc.records[i]
            
            # Check multiple fields for spell names
            for field_idx in [1, 2, 3, 4, 5]:  # Common name fields
                if field_idx < len(record):
                    string_val = spell_dbc.get_string(record[field_idx])
                    if string_val and any(keyword in string_val.lower() for keyword in spell_keywords):
                        if string_val not in section_found:
                            section_found.append(string_val)
                            print(f"  Record {i}, Field {field_idx}: '{string_val}' (ID: {record[0]})")
            
            if len(section_found) >= 5:
                break

def analyze_record_patterns():
    """Analyze patterns in records to understand structure"""
    dbc_path = 'game-data/DBFilesClient/Spell.dbc'
    spell_dbc = DBCReader(dbc_path)
    
    print("\n=== Analyzing record patterns ===")
    
    # Look at records that have non-zero values in early fields
    interesting_records = []
    
    for i, record in enumerate(spell_dbc.records[:500]):  # First 500 records
        # Count how many non-zero fields in first 10 positions
        non_zero_count = sum(1 for val in record[:10] if val != 0)
        
        if non_zero_count >= 3:  # Records with some data
            # Look for strings in first 10 fields
            strings_found = []
            for field_idx in range(10):
                string_val = spell_dbc.get_string(record[field_idx])
                if string_val and len(string_val) > 2:
                    strings_found.append((field_idx, string_val))
            
            if strings_found:
                interesting_records.append((i, record[0], strings_found))
    
    print(f"Found {len(interesting_records)} interesting records in first 500:")
    for i, record_id, strings in interesting_records[:10]:
        print(f"  Record {i}: ID={record_id}, Strings: {strings}")

def check_alternate_spell_files():
    """Check if there are other files that might contain spell data"""
    dbc_path = Path('game-data/DBFilesClient/')
    
    print("\n=== Checking for alternate spell data files ===")
    
    # Look for files that might contain spell data
    potential_files = []
    for dbc_file in dbc_path.glob('*.dbc'):
        if dbc_file.stat().st_size > 1000000:  # Files over 1MB
            potential_files.append(dbc_file.name)
    
    print("Large DBC files that might contain spell data:")
    for filename in sorted(potential_files)[:10]:
        print(f"  {filename}")

if __name__ == "__main__":
    find_real_spells()
    scan_for_spell_names()
    analyze_record_patterns()
    check_alternate_spell_files()