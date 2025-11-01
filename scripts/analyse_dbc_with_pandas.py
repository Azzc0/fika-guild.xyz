#!/usr/bin/env python3
"""
Analyze DBC files using pandas for better data exploration
"""
import struct
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List

class DBCReader:
    """Read WoW 1.12 DBC files"""
    
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.records = []
        self.string_block = b''
        self.field_count = 0
        self.record_size = 0
        self.record_count = 0
        self._read_file()
    
    def _read_file(self):
        """Read the DBC file structure"""
        with open(self.file_path, 'rb') as f:
            header = f.read(20)
            magic, record_count, field_count, record_size, string_block_size = \
                struct.unpack('<4sIIII', header)
            
            if magic != b'WDBC':
                raise ValueError(f"Not a valid DBC file: {self.file_path}")
            
            self.field_count = field_count
            self.record_size = record_size
            self.record_count = record_count
            
            # Read all records as uint32 fields
            for i in range(record_count):
                record_data = f.read(record_size)
                if len(record_data) != record_size:
                    break
                
                record = []
                for j in range(field_count):
                    offset = j * 4
                    if offset + 4 <= len(record_data):
                        value = struct.unpack('<I', record_data[offset:offset+4])[0]
                        record.append(value)
                    else:
                        record.append(0)
                
                self.records.append(record)
            
            self.string_block = f.read(string_block_size)
    
    def get_string(self, offset: int) -> str:
        """Extract null-terminated string from string block"""
        if offset >= len(self.string_block):
            return ""
        
        end = self.string_block.find(b'\x00', offset)
        if end == -1:
            return ""
        
        try:
            return self.string_block[offset:end].decode('utf-8', errors='ignore')
        except:
            return ""


def dbc_to_dataframe(dbc_path: Path, dbc_filename: str, max_records: int = None) -> pd.DataFrame:
    """
    Load DBC file into a pandas DataFrame for analysis
    """
    print(f"\nLoading {dbc_filename}...")
    dbc = DBCReader(dbc_path / dbc_filename)
    
    # Create column names
    columns = [f"field_{i}" for i in range(dbc.field_count)]
    
    # Convert to DataFrame
    records = dbc.records[:max_records] if max_records else dbc.records
    df = pd.DataFrame(records, columns=columns)
    
    # Add resolved strings for fields that look like string offsets
    print(f"  Resolving string fields...")
    for col in df.columns:
        # Check if this field contains string offsets
        sample_values = df[col].head(100).values
        string_count = 0
        
        for val in sample_values:
            if val > 0 and val < len(dbc.string_block):
                s = dbc.get_string(val)
                if s and len(s) > 0:
                    string_count += 1
        
        # If >30% of samples resolve to strings, add a string column
        if string_count > len(sample_values) * 0.3:
            df[f"{col}_str"] = df[col].apply(lambda x: dbc.get_string(x) if x < len(dbc.string_block) else "")
    
    print(f"  Loaded {len(df)} records with {len(df.columns)} columns")
    return df


def analyze_spell_structure(df: pd.DataFrame):
    """
    Analyze Spell.dbc structure to find the correct field mappings
    """
    print("\n" + "="*80)
    print("SPELL.DBC STRUCTURE ANALYSIS")
    print("="*80)
    
    # Find all string columns
    string_cols = [col for col in df.columns if col.endswith('_str')]
    
    print(f"\nFound {len(string_cols)} string fields")
    print("\nAnalyzing localized name fields (120-132):")
    print("-" * 80)
    
    # Check fields 120-132 for spell names
    for i in range(120, min(133, len(df.columns))):
        col_name = f"field_{i}"
        str_col_name = f"{col_name}_str"
        
        if str_col_name in df.columns:
            # Sample non-empty strings
            samples = df[str_col_name][df[str_col_name] != ""].head(10).tolist()
            
            # Detect language
            non_ascii_count = sum(1 for s in samples if any(ord(c) > 127 for c in s))
            lang_guess = "Non-English" if non_ascii_count > len(samples) * 0.3 else "English"
            
            print(f"\nField {i} ({lang_guess}):")
            for j, sample in enumerate(samples[:5], 1):
                print(f"  {j}. {sample[:60]}")
    
    print("\n" + "-"*80)
    print("\nAnalyzing rank/subtext fields (133-141):")
    print("-" * 80)
    
    for i in range(133, min(142, len(df.columns))):
        col_name = f"field_{i}"
        str_col_name = f"{col_name}_str"
        
        if str_col_name in df.columns:
            samples = df[str_col_name][df[str_col_name] != ""].head(5).tolist()
            if samples:
                print(f"\nField {i}:")
                for j, sample in enumerate(samples[:3], 1):
                    print(f"  {j}. {sample[:60]}")
    
    print("\n" + "-"*80)
    print("\nAnalyzing icon fields (likely 20-30):")
    print("-" * 80)
    
    for i in range(20, 30):
        col_name = f"field_{i}"
        if col_name in df.columns:
            unique_count = df[col_name].nunique()
            non_zero = (df[col_name] != 0).sum()
            max_val = df[col_name].max()
            
            if unique_count > 1 and unique_count < 2000 and max_val < 10000:
                print(f"\nField {i}:")
                print(f"  Unique values: {unique_count}")
                print(f"  Non-zero: {non_zero}")
                print(f"  Range: {df[col_name].min()} - {max_val}")
                print(f"  Top values: {df[col_name].value_counts().head(5).to_dict()}")


def show_spell_samples(df: pd.DataFrame, field_idx: int, count: int = 20):
    """
    Show sample spells from a specific field
    """
    col_name = f"field_{field_idx}"
    str_col_name = f"{col_name}_str"
    
    if str_col_name not in df.columns:
        print(f"Field {field_idx} is not a string field")
        return
    
    print(f"\n" + "="*80)
    print(f"SPELL SAMPLES FROM FIELD {field_idx}")
    print("="*80)
    
    # Get samples with non-empty names
    samples = df[df[str_col_name] != ""][['field_0', str_col_name]].head(count)
    
    for idx, row in samples.iterrows():
        spell_id = row['field_0']
        spell_name = row[str_col_name]
        
        # Check if English
        is_english = not any(ord(c) > 127 for c in spell_name)
        lang_marker = "✓" if is_english else "✗"
        
        print(f"{lang_marker} ID {spell_id:6d}: {spell_name}")


def compare_name_fields(df: pd.DataFrame, sample_size: int = 50):
    """
    Compare different name field candidates to find the best English field
    """
    print("\n" + "="*80)
    print("COMPARING NAME FIELD CANDIDATES")
    print("="*80)
    
    # Check fields that might contain spell names
    candidate_fields = [120, 121, 122, 123, 124, 125, 126, 127]
    
    results = []
    
    for field_idx in candidate_fields:
        col_name = f"field_{field_idx}"
        str_col_name = f"{col_name}_str"
        
        if str_col_name not in df.columns:
            continue
        
        # Get sample of non-empty strings
        samples = df[df[str_col_name] != ""][str_col_name].head(sample_size).tolist()
        
        if not samples:
            continue
        
        # Calculate metrics
        total = len(samples)
        non_ascii = sum(1 for s in samples if any(ord(c) > 127 for c in s))
        avg_length = sum(len(s) for s in samples) / total
        has_old = sum(1 for s in samples if '(OLD)' in s)
        has_test = sum(1 for s in samples if 'TEST' in s.upper())
        
        results.append({
            'field': field_idx,
            'samples': total,
            'english_pct': (total - non_ascii) / total * 100,
            'avg_length': avg_length,
            'has_old': has_old,
            'has_test': has_test,
            'first_sample': samples[0] if samples else ""
        })
    
    # Create comparison DataFrame
    comparison_df = pd.DataFrame(results)
    comparison_df = comparison_df.sort_values('english_pct', ascending=False)
    
    print("\nField Comparison (sorted by English likelihood):")
    print(comparison_df.to_string(index=False))
    
    # Show best candidate
    if not comparison_df.empty:
        best_field = comparison_df.iloc[0]['field']
        print(f"\n✓ RECOMMENDED FIELD: {int(best_field)}")
        print(f"  English rate: {comparison_df.iloc[0]['english_pct']:.1f}%")
        print(f"  Sample: {comparison_df.iloc[0]['first_sample']}")


def main():
    """Interactive DBC analysis"""
    dbc_path = Path('game-data/DBFilesClient/')
    
    if not dbc_path.exists():
        print(f"ERROR: {dbc_path} not found")
        return
    
    print("="*80)
    print("WoW 1.12 DBC Interactive Analysis with Pandas")
    print("="*80)
    
    # Load Spell.dbc into DataFrame
    spell_df = dbc_to_dataframe(dbc_path, 'Spell.dbc', max_records=5000)
    
    # Perform structure analysis
    analyze_spell_structure(spell_df)
    
    # Compare name fields
    compare_name_fields(spell_df)
    
    # Show samples from recommended field
    print("\n")
    show_spell_samples(spell_df, 120, count=30)
    
    print("\n" + "="*80)
    print("DATAFRAME SAVED TO VARIABLE")
    print("="*80)
    print("\nYou can now explore interactively:")
    print("  spell_df.head()                    # View first rows")
    print("  spell_df['field_120_str'].head()   # View specific field")
    print("  spell_df[spell_df['field_0'] == 133]  # Look up specific spell")
    print("  spell_df.columns                   # List all columns")
    
    return spell_df


if __name__ == "__main__":
    spell_df = main()