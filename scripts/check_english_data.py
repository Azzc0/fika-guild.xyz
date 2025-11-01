# check_english_data.py
import struct
from pathlib import Path

def check_other_dbc_files():
    """Check other DBC files for English content"""
    dbc_path = Path('game-data/DBFilesClient/')
    
    print("=== Checking other DBC files for English content ===")
    
    # Files that might contain spell data in different formats
    test_files = [
        'SkillLineAbility.dbc',  # Links spells to classes
        'SpellCategory.dbc',     # Spell categories
        'SpellRange.dbc',        # Spell ranges
        'Talent.dbc',            # Talents (which are spells)
        'TalentTab.dbc'          # Talent tabs
    ]
    
    for filename in test_files:
        file_path = dbc_path / filename
        if file_path.exists():
            print(f"\n--- {filename} ---")
            try:
                with open(file_path, 'rb') as f:
                    header = f.read(20)
                    magic, record_count, field_count, record_size, string_block_size = struct.unpack('<4sIIII', header)
                    
                    if magic == b'WDBC':
                        # Read string block and check for English
                        f.seek(20 + (record_count * record_size))
                        string_block = f.read(min(1000, string_block_size))
                        
                        # Look for ASCII text
                        english_found = []
                        current_string = ""
                        for byte in string_block:
                            if 32 <= byte <= 126:
                                current_string += chr(byte)
                            else:
                                if len(current_string) > 10:
                                    english_found.append(current_string)
                                current_string = ""
                        
                        if english_found:
                            print(f"  Found English strings: {english_found[:3]}")
                        else:
                            print(f"  No significant English strings found")
            except Exception as e:
                print(f"  Error reading: {e}")

def suggest_solutions():
    print("\n=== Recommended Next Steps ===")
    print("1. Try extracting from an English WoW client (US/UK version)")
    print("2. The current DBC files appear to be from a multilingual/client")
    print("3. Look for 'enUS' or 'enGB' specific data files")
    print("4. Consider using the MPQ from the English WoW client")
    print("\nIf you must use this data:")
    print("- You'll need to identify which fields contain which languages")
    print("- This typically requires reverse-engineering the field structure")
    print("- Or finding documentation for Vanilla WoW 1.12.1 DBC formats")

if __name__ == "__main__":
    check_other_dbc_files()
    suggest_solutions()