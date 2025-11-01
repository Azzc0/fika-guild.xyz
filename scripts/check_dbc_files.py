# check_dbc_files.py
import os
from pathlib import Path

def check_all_dbc_files():
    """Check what DBC files we have available"""
    dbc_path = Path('game-data/DBFilesClient/')
    
    print("=== All DBC Files ===")
    dbc_files = list(dbc_path.glob('*.dbc'))
    
    # Sort by file size to find the largest (likely main data files)
    dbc_files_with_size = []
    for dbc_file in dbc_files:
        size = dbc_file.stat().st_size
        dbc_files_with_size.append((dbc_file.name, size))
    
    # Sort by size descending
    dbc_files_with_size.sort(key=lambda x: x[1], reverse=True)
    
    for filename, size in dbc_files_with_size[:20]:  # Top 20 largest files
        print(f"{filename:40} {size:10,} bytes")
    
    return dbc_files_with_size

def check_spell_related_files():
    """Check for spell-related DBC files"""
    dbc_path = Path('game-data/DBFilesClient/')
    
    spell_related = []
    for dbc_file in dbc_path.glob('*Spell*.dbc'):
        size = dbc_file.stat().st_size
        spell_related.append((dbc_file.name, size))
    
    print("\n=== Spell-related DBC Files ===")
    for filename, size in spell_related:
        print(f"{filename:30} {size:10,} bytes")

if __name__ == "__main__":
    check_all_dbc_files()
    check_spell_related_files()