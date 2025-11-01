#!/bin/bash
# convert_all_blp.sh

# Enable aliases
shopt -s expand_aliases

# Source bashrc to get the proton alias
source ~/.bashrc

INPUT_DIR="game-data/Interface/Icons"
OUTPUT_DIR="cdn/Interface/Icons"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Convert only BLP files that don't have valid PNGs yet
find "$INPUT_DIR" -name "*.blp" | while read blp_file; do
    # Get the filename without extension
    filename=$(basename "$blp_file" .blp)
    
    # Set output path
    output_file="$OUTPUT_DIR/$filename.png"
    
    # Skip if PNG already exists and has reasonable size (>1KB)
    if [ -f "$output_file" ] && [ $(stat -c%s "$output_file") -gt 1024 ]; then
        echo "✓ Already exists: $filename.png"
        continue
    fi
    
    echo "Converting: $filename.blp"
    
    # Convert using proton
    proton scripts/BLPConverter.exe "$blp_file" "$output_file"
    
    # Check if conversion was successful
    if [ -f "$output_file" ] && [ $(stat -c%s "$output_file") -gt 1024 ]; then
        echo "✓ Converted: $filename.png"
    else
        echo "✗ Failed: $filename.blp"
        # Remove empty/corrupted file if it was created
        [ -f "$output_file" ] && rm "$output_file"
    fi
done

echo "Conversion complete! Check $OUTPUT_DIR"