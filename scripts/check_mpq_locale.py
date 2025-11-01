# check_mpq_locale.py
from pathlib import Path

def find_mpq_files():
    """Find available MPQ files to identify locales"""
    mpq_path = Path('game-data/')  # Adjust this path to your MPQ location
    
    print("=== Looking for MPQ files ===")
    
    mpq_files = []
    for ext in ['*.mpq', '*.MPQ']:
        mpq_files.extend(mpq_path.rglob(ext))
    
    if not mpq_files:
        print("No MPQ files found in game-data/")
        print("MPQ files are usually in the WoW install directory:")
        print("  - World of Warcraft/Data/")
        return
    
    # Group by likely locale
    locales = {}
    for mpq_file in sorted(mpq_files):
        filename = mpq_file.name.lower()
        
        if 'enus' in filename or 'base' in filename and 'en' in filename:
            locale = 'enUS'
        elif 'engb' in filename:
            locale = 'enGB'
        elif 'dede' in filename:
            locale = 'deDE'
        elif 'frfr' in filename:
            locale = 'frFR'
        elif 'ruru' in filename:
            locale = 'ruRU'
        elif 'zhcn' in filename:
            locale = 'zhCN'
        else:
            locale = 'unknown'
        
        locales.setdefault(locale, []).append(mpq_file.name)
    
    print("\nFound MPQ files by locale:")
    for locale, files in locales.items():
        print(f"\n{locale}:")
        for file in files[:3]:  # Show first 3 files per locale
            print(f"  {file}")
        if len(files) > 3:
            print(f"  ... and {len(files) - 3} more")

def suggest_extraction():
    print("\n=== Recommended Extraction ===")
    print("1. Find MPQ files with 'enUS' in the filename")
    print("2. In MPQEditor, open those specific MPQs (not merge view)")
    print("3. Extract DBFilesClient/ from the enUS MPQs")
    print("4. This should give you English DBC files")
    print("\nCommon enUS MPQ names for Vanilla WoW:")
    print("  - base-enUS.MPQ")
    print("  - patch-enUS.MPQ") 
    print("  - patch.MPQ (sometimes contains locale data)")

if __name__ == "__main__":
    find_mpq_files()
    suggest_extraction()