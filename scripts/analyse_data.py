import struct
import os
from pathlib import Path
from collections import Counter

class DBCReader:
    def __init__(self, file_path):
        self.file_path = file_path
        self.records = []
        self.string_block = b''
        self.field_count = 0
        self.record_size = 0
        self.record_count = 0
        self.read_file()
    
    def read_file(self):
        with open(self.file_path, 'rb') as f:
            header = f.read(20)
            magic, record_count, field_count, record_size, string_block_size = struct.unpack('<4sIIII', header)
            
            if magic != b'WDBC':
                raise ValueError(f"Not a valid DBC file: {self.file_path}")
            
            self.field_count = field_count
            self.record_size = record_size
            self.record_count = record_count
            
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
                try:
                    return self.string_block[offset:end].decode('utf-8', errors='ignore')
                except:
                    return ""
        return ""
    
    def analyze_field(self, field_idx, sample_size=20):
        """Analyze a specific field across records"""
        values = []
        strings = []
        
        for i, record in enumerate(self.records[:sample_size]):
            if field_idx < len(record):
                value = record[field_idx]
                values.append(value)
                
                # Try to interpret as string offset
                string_val = self.get_string(value)
                if string_val:
                    strings.append(string_val)
        
        return {
            'values': values,
            'strings': strings,
            'value_range': (min(values) if values else 0, max(values) if values else 0),
            'unique_count': len(set(values))
        }

def analyze_dbc_file(file_path, sample_records=10):
    """Comprehensive analysis of a DBC file"""
    print(f"\n{'='*80}")
    print(f"Analyzing: {file_path.name}")
    print(f"{'='*80}")
    
    try:
        dbc = DBCReader(str(file_path))
    except Exception as e:
        print(f"ERROR: Could not read file: {e}")
        return
    
    print(f"\nFile Structure:")
    print(f"  Total Records: {dbc.record_count}")
    print(f"  Fields per Record: {dbc.field_count}")
    print(f"  Record Size: {dbc.record_size} bytes")
    print(f"  String Block Size: {len(dbc.string_block)} bytes")
    
    # Analyze first few records
    print(f"\nFirst {sample_records} Records (Field Analysis):")
    print(f"{'Field':<8} {'Type Guess':<15} {'Sample Values':<50}")
    print("-" * 80)
    
    for field_idx in range(min(dbc.field_count, 50)):  # Limit to first 50 fields
        analysis = dbc.analyze_field(field_idx, sample_records)
        
        # Guess field type
        if analysis['strings'] and len(analysis['strings']) > len(analysis['values']) * 0.3:
            field_type = "String"
            sample = ", ".join(analysis['strings'][:3])
        elif analysis['unique_count'] == 1:
            field_type = "Constant"
            sample = str(analysis['values'][0])
        elif analysis['value_range'][1] < 1000 and analysis['unique_count'] < sample_records:
            field_type = "Enum/Flag"
            sample = str(analysis['values'][:5])
        elif all(v < 10000000 for v in analysis['values']):
            field_type = "Integer/ID"
            sample = str(analysis['values'][:5])
        else:
            field_type = "Large Int/Ptr"
            sample = str(analysis['values'][:3])
        
        print(f"{field_idx:<8} {field_type:<15} {sample[:48]}")
    
    # Find string-heavy fields (likely localized text)
    print(f"\nString Fields (likely localized):")
    string_fields = []
    for field_idx in range(dbc.field_count):
        analysis = dbc.analyze_field(field_idx, 50)
        if len(analysis['strings']) > 20:  # Found many strings
            string_fields.append((field_idx, analysis['strings'][:5]))
    
    for field_idx, sample_strings in string_fields[:20]:  # Show first 20
        print(f"  Field {field_idx}: {sample_strings[:3]}")
    
    # Detect language patterns
    if string_fields:
        print(f"\nLanguage Detection:")
        all_strings = []
        for _, strings in string_fields:
            all_strings.extend(strings)
        
        # Check for common English words
        english_indicators = ['the', 'a', 'an', 'of', 'and', 'to']
        non_ascii_count = sum(1 for s in all_strings if any(ord(c) > 127 for c in s))
        
        print(f"  Total strings sampled: {len(all_strings)}")
        print(f"  Strings with non-ASCII chars: {non_ascii_count} ({non_ascii_count/len(all_strings)*100:.1f}%)")
        
        # Show sample strings
        print(f"\n  Sample strings from various fields:")
        for s in all_strings[:10]:
            print(f"    - {s}")
    
    return dbc

def main():
    dbc_path = Path('game-data/DBFilesClient/')
    
    if not dbc_path.exists():
        print(f"ERROR: Directory not found: {dbc_path}")
        print("Please ensure the game-data symlink is set up correctly")
        return
    
    # Priority files to analyze
    priority_files = ['Spell.dbc', 'Item.dbc', 'ItemDisplayInfo.dbc', 'SpellIcon.dbc']
    
    print("DBC Structure Analyzer for WoW 1.12")
    print("="*80)
    
    for filename in priority_files:
        file_path = dbc_path / filename
        if file_path.exists():
            analyze_dbc_file(file_path, sample_records=15)
        else:
            print(f"\nWARNING: {filename} not found")
    
    # List all available DBC files
    print(f"\n{'='*80}")
    print("All Available DBC Files:")
    print(f"{'='*80}")
    dbc_files = sorted(dbc_path.glob('*.dbc'))
    print(f"Found {len(dbc_files)} DBC files:")
    for i, f in enumerate(dbc_files, 1):
        print(f"  {i:3d}. {f.name}")
    
    print("\n" + "="*80)
    print("Analysis complete!")
    print("="*80)
    print("\nNext steps:")
    print("1. Review the field analysis above to identify:")
    print("   - ID fields (usually field 0)")
    print("   - Name fields (string fields)")
    print("   - Icon ID fields (small integers)")
    print("2. Check if multiple consecutive string fields = localized versions")
    print("3. Look up WoW 1.12 DBC documentation for field mappings")

if __name__ == "__main__":
    main()