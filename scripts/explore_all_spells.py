# explore_all_spells.py
from dbc_reader import DBCReader

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
        11681: "Hellfire",  # Warlock spell
        11366: "Pyroblast", # Mage spell
        50796: "Cleave",    # Warrior spell
        4987: "Cleanse"     # Paladin spell
    }
    
    print("=== Searching for known spells ===")
    
    found_count = 0
    for expected_id, expected_name in known_spells.items():
        found = False
        for record in spell_dbc.records:
            if record[0] == expected_id:
                # Try multiple fields for the name
                for field_idx in range(min(50, len(record))):  # Check first 50 fields
                    string_val = spell_dbc.get_string(record[field_idx])
                    if string_val and expected_name.lower() in string_val.lower():
                        print(f"✓ FOUND: ID {expected_id} - '{expected_name}'")
                        print(f"  Field {field_idx}: '{string_val}'")
                        print(f"  Full record start: {record[:10]}...")
                        found = True
                        found_count += 1
                        break
                if not found:
                    print(f"✗ Found ID {expected_id} but couldn't find name '{expected_name}'")
                    print(f"  First 20 fields: {record[:20]}")
                break
        else:
            print(f"✗ ID {expected_id} not found in DBC")
    
    print(f"\nFound {found_count}/{len(known_spells)} known spells")
    
    # Now let's scan for any spell-like names in the entire file
    print("\n=== Scanning for spell-like names in first 1000 records ===")
    
    spell_keywords = ['fire', 'frost', 'shadow', 'arcane', 'heal', 'lightning', 'bolt', 'armor', 'strike']
    found_spells = []
    
    for i, record in enumerate(spell_dbc.records[:1000]):
        for field_idx, value in enumerate(record[:20]):  # Check first 20 fields
            string_val = spell_dbc.get_string(value)
            if string_val and len(string_val) > 3:
                # Check if it looks like a spell name
                if any(keyword in string_val.lower() for keyword in spell_keywords):
                    if string_val not in found_spells:
                        found_spells.append(string_val)
                        print(f"Record {i}, Field {field_idx}: '{string_val}'")
                        if len(found_spells) >= 20:
                            break
        if len(found_spells) >= 20:
            break

def analyze_spell_structure():
    """Analyze the structure by looking at field patterns"""
    dbc_path = 'game-data/DBFilesClient/Spell.dbc'
    spell_dbc = DBCReader(dbc_path)
    
    print("=== Analyzing Spell.dbc Structure ===")
    
    # Look at the first 20 records in detail
    for i in range(min(20, len(spell_dbc.records))):
        record = spell_dbc.records[i]
        print(f"\n--- Record {i} (ID: {record[0]}) ---")
        
        # Show fields that contain strings
        string_fields = []
        for field_idx, value in enumerate(record[:30]):  # First 30 fields
            string_val = spell_dbc.get_string(value)
            if string_val and len(string_val) > 2:
                string_fields.append((field_idx, string_val))
        
        if string_fields:
            for field_idx, string_val in string_fields[:5]:  # Show first 5 string fields
                print(f"  Field {field_idx}: '{string_val}'")
        else:
            print("  No significant strings found in first 30 fields")

def check_different_sections():
    """Check if real spells are in a different section of the file"""
    dbc_path = 'game-data/DBFilesClient/Spell.dbc'
    spell_dbc = DBCReader(dbc_path)
    
    print("=== Checking different file sections ===")
    
    # Check beginning
    print("\n--- Beginning of file (first 10 records) ---")
    for i in range(10):
        record = spell_dbc.records[i]
        print(f"Record {i}: ID={record[0]}, First fields: {record[:5]}")
    
    # Check middle
    middle = len(spell_dbc.records) // 2
    print(f"\n--- Middle of file (records {middle}-{middle+10}) ---")
    for i in range(middle, middle + 10):
        record = spell_dbc.records[i]
        print(f"Record {i}: ID={record[0]}, First fields: {record[:5]}")
    
    # Check end
    print(f"\n--- End of file (last 10 records) ---")
    for i in range(len(spell_dbc.records) - 10, len(spell_dbc.records)):
        record = spell_dbc.records[i]
        print(f"Record {i}: ID={record[0]}, First fields: {record[:5]}")

if __name__ == "__main__":
    find_real_spells()
    analyze_spell_structure() 
    check_different_sections()