# convert_blp_webp.py
import os
from pathlib import Path
import concurrent.futures
from blp import blp
from PIL import Image

def convert_blp_to_webp(blp_path, output_dir, quality=95, lossless=True):
    """Convert BLP to WebP using the blp library"""
    try:
        # Extract relative path
        rel_path = blp_path.relative_to(Path("game-data/Interface/Icons"))
        output_path = output_dir / rel_path.with_suffix('.webp')
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert BLP to PIL Image
        with blp.open(blp_path) as img:
            pil_image = img.to_PIL()
            
            # Save as WebP
            pil_image.save(
                output_path,
                'WEBP',
                lossless=lossless,
                quality=quality,
                method=6
            )
        
        print(f"✓ Converted: {rel_path}")
        return True
        
    except Exception as e:
        print(f"✗ Failed: {blp_path} - {e}")
        return False

def batch_convert():
    input_dir = Path("game-data/Interface/Icons")
    output_dir = Path("export/icons")
    
    # Find all BLP files
    blp_files = list(input_dir.rglob("*.blp"))
    print(f"Found {len(blp_files)} BLP files")
    
    # Convert in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [
            executor.submit(convert_blp_to_webp, blp_file, output_dir)
            for blp_file in blp_files
        ]
        
        results = [f.result() for f in futures]
    
    successful = sum(results)
    print(f"Complete: {successful}/{len(blp_files)} successful")

if __name__ == "__main__":
    batch_convert()