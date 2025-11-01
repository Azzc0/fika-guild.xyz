#!/usr/bin/env python3
"""
Spell Column Verifier
Checks that each column has distinct, meaningful values across multiple spells
"""

import json
from pathlib import Path
from collections import Counter

def verify_columns(json_path: Path):
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    spells = data['spells']
    schema = data['schema']
    
    print("🔍 SPELL COLUMN VERIFICATION")
    print("=" * 60)
    
    # Analyze each column
    for col_idx, col_name in enumerate(schema):
        print(f"\n📊 Column {col_idx}: {col_name}")
        print("-" * 40)
        
        # Get values for this column across all spells
        values = [spell[col_idx] for spell in spells]
        
        # Count unique values
        value_counts = Counter(values)
        non_empty = [v for v in values if v not in [None, "", 0, [], {}]]
        
        print(f"   Total spells: {len(values):,}")
        print(f"   Non-empty values: {len(non_empty):,}")
        print(f"   Unique values: {len(value_counts):,}")
        
        # Show most common values
        if value_counts:
            print(f"   Most common values:")
            for val, count in value_counts.most_common(5):
                display_val = str(val)[:50] + "..." if len(str(val)) > 50 else str(val)
                print(f"     '{display_val}': {count:,}")
        
        # Find spells with distinct values for manual verification
        distinct_spells = []
        seen_values = set()
        
        for spell_idx, spell in enumerate(spells):
            val = spell[col_idx]
            if val not in [None, "", 0, [], {}] and val not in seen_values:
                seen_values.add(val)
                distinct_spells.append((spell_idx, val))
                if len(distinct_spells) >= 3:  # Get 3 examples
                    break
        
        if distinct_spells:
            print(f"   Example spells with distinct values:")
            for spell_idx, val in distinct_spells:
                spell_id = spells[spell_idx][0]  # ID is first column
                spell_name = spells[spell_idx][1]  # Name is second column
                display_val = str(val)[:50] + "..." if len(str(val)) > 50 else str(val)
                print(f"     ID {spell_id}: '{spell_name}' → {display_val}")

def compare_specific_spells(json_path: Path, spell_ids: list):
    """Compare specific spells side-by-side"""
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    spells = data['spells']
    schema = data['schema']
    
    print(f"\n🔍 COMPARING SPELLS {spell_ids}")
    print("=" * 60)
    
    # Find the spells
    found_spells = []
    for spell in spells:
        if spell[0] in spell_ids:  # ID is first column
            found_spells.append(spell)
            if len(found_spells) == len(spell_ids):
                break
    
    if not found_spells:
        print("No spells found with those IDs!")
        return
    
    # Display comparison table
    header = ["Column"] + [f"Spell {s[0]}" for s in found_spells]
    print(f"{header[0]:<20} {header[1]:<30} {header[2]:<30}")
    print("-" * 80)
    
    for col_idx, col_name in enumerate(schema):
        row = [col_name]
        for spell in found_spells:
            val = spell[col_idx]
            display_val = str(val)[:28] + "..." if len(str(val)) > 28 else str(val)
            row.append(display_val)
        
        print(f"{row[0]:<20} {row[1]:<30} {row[2]:<30}")

if __name__ == "__main__":
    json_path = Path('output/spells.json')
    
    if not json_path.exists():
        print(f"Error: {json_path} not found")
        exit(1)
    
    # Run full column verification
    verify_columns(json_path)
    
    # Compare some known spells (Fireball, Frostbolt, Healing Touch)
    print("\n" + "=" * 80)
    compare_specific_spells(json_path, [133, 116, 5185])