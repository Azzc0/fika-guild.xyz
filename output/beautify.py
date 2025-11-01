#!/usr/bin/env python3
"""
JSON Beautifier Utility
Converts minified JSON to readable formatted JSON

Usage: python beautify_json.py input.json [output.json]
"""

import json
import sys
from pathlib import Path

def beautify_json(input_file: Path, output_file: Path = None):
    """Convert minified JSON to formatted JSON"""
    if output_file is None:
        output_file = input_file.with_suffix('.formatted.json')
    
    print(f"Reading: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Writing: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    # Show size comparison
    input_size = input_file.stat().st_size
    output_size = output_file.stat().st_size
    print(f"Size: {input_size:,} → {output_size:,} bytes")
    print(f"Ratio: {output_size/input_size:.1f}x larger")

def main():
    if len(sys.argv) < 2:
        print("Usage: python beautify_json.py input.json [output.json]")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    
    if not input_file.exists():
        print(f"Error: {input_file} not found")
        sys.exit(1)
    
    try:
        beautify_json(input_file, output_file)
        print("✓ Beautification complete!")
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()