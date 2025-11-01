# check_file_signature.py
import struct
from pathlib import Path

def check_spell_file():
    """Check the actual structure of the Spell.dbc file"""
    dbc_path = Path('game-data/DBFilesClient/Spell.dbc')
    
    print("=== Spell.dbc File Analysis ===")
    print(f"File size: {dbc_path.stat().st_size:,} bytes")
    
    with open(dbc_path, 'rb') as f:
        # Read header
        header = f.read(20)
        magic, record_count, field_count, record_size, string_block_size = struct.unpack('<4sIIII', header)
        
        print(f"Magic: {magic}")
        print(f"Record count: {record_count}")
        print(f"Field count: {field_count}")
        print(f"Record size: {record_size}")
        print(f"String block size: {string_block_size}")
        
        # Read first few records to see actual data
        print(f"\n=== First 5 records ===")
        for i in range(5):
            record_data = f.read(record_size)
            if record_data:
                # Parse as integers
                record_ints = []
                for j in range(min(10, field_count)):  # First 10 fields
                    start = j * 4
                    field_bytes = record_data[start:start+4]
                    if len(field_bytes) == 4:
                        value = struct.unpack('<I', field_bytes)[0]
                        record_ints.append(value)
                
                print(f"Record {i}: {record_ints}")
        
        # Try to find string block and look for spell names
        print(f"\n=== Looking for spell names in string block ===")
        f.seek(20 + (record_count * record_size))  # Go to string block
        string_block = f.read(min(5000, string_block_size))  # Read first 5KB of strings
        
        # Look for known spell names in the string block
        test_names = [b'Fireball', b'Frostbolt', b'Shadow Bolt', b'Healing']
        for name in test_names:
            if name in string_block:
                position = string_block.find(name)
                context = string_block[max(0, position-20):position+50]
                print(f"Found '{name.decode()}' at position {position}")
                print(f"  Context: ...{context.decode('utf-8', errors='ignore')}...")

if __name__ == "__main__":
    check_spell_file()