#!/usr/bin/env python3
"""
Complete WoW 1.12 Spell.dbc extractor with all meaningful fields
Based on wowdev.wiki field documentation
"""
import struct
import pandas as pd
from pathlib import Path

class DBCReader:
    """Read WoW 1.12 DBC files"""
    
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.records = []
        self.string_block = b''
        self.field_count = 0
        self._read_file()
    
    def _read_file(self):
        with open(self.file_path, 'rb') as f:
            header = f.read(20)
            magic, record_count, field_count, record_size, string_block_size = \
                struct.unpack('<4sIIII', header)
            
            if magic != b'WDBC':
                raise ValueError(f"Not a valid DBC file: {self.file_path}")
            
            self.field_count = field_count
            
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
        if offset >= len(self.string_block):
            return ""
        end = self.string_block.find(b'\x00', offset)
        if end == -1:
            return ""
        try:
            return self.string_block[offset:end].decode('utf-8', errors='ignore')
        except:
            return ""
    
    def get_float(self, int_value: int) -> float:
        """Convert uint32 to float"""
        return struct.unpack('f', struct.pack('I', int_value))[0]


# School constants
SPELL_SCHOOLS = {
    0: "Physical",
    1: "Holy", 
    2: "Fire",
    3: "Nature",
    4: "Frost",
    5: "Shadow",
    6: "Arcane"
}

# Power type constants
POWER_TYPES = {
    -2: "Health",
    0: "Mana",
    1: "Rage",
    2: "Focus",
    3: "Energy",
    4: "Happiness"
}

# Dispel type constants
DISPEL_TYPES = {
    0: "None",
    1: "Magic",
    2: "Curse",
    3: "Disease",
    4: "Poison",
    5: "Stealth",
    6: "Invisibility",
    7: "All",
    8: "SPE NPC Only",
    9: "Enrage",
    10: "ZG Ticket"
}

# Mechanic constants
SPELL_MECHANICS = {
    0: "None",
    1: "Charmed",
    2: "Disoriented",
    3: "Disarmed",
    4: "Distracted",
    5: "Feared",
    6: "Gripped",
    7: "Rooted",
    8: "Pacified",
    9: "Silenced",
    10: "Asleep",
    11: "Snared",
    12: "Stunned",
    13: "Frozen",
    14: "Incapacitated",
    15: "Bleeding",
    16: "Healing",
    17: "Polymorphed",
    18: "Banished",
    19: "Shielded",
    20: "Shackled",
    21: "Mounted",
    22: "Seduced",
    23: "Turned",
    24: "Horrified",
    25: "Invulnerable",
    26: "Interrupted",
    27: "Dazed",
    28: "Discovery",
    29: "Invulnerable Detaunt",
    30: "Sapped",
    31: "Enraged"
}


def load_spell_icons(dbc_path: Path) -> dict:
    """Load icon mapping"""
    print("Loading SpellIcon.dbc...")
    dbc = DBCReader(dbc_path / 'SpellIcon.dbc')
    
    icon_map = {}
    for record in dbc.records:
        icon_id = record[0]
        texture_path = dbc.get_string(record[1])
        if texture_path:
            icon_name = texture_path.split('\\')[-1]
            icon_map[icon_id] = icon_name
    
    print(f"  Loaded {len(icon_map)} icons")
    return icon_map


def load_spell_durations(dbc_path: Path) -> dict:
    """Load SpellDuration.dbc"""
    duration_file = dbc_path / 'SpellDuration.dbc'
    if not duration_file.exists():
        return {}
    
    print("Loading SpellDuration.dbc...")
    dbc = DBCReader(duration_file)
    
    duration_map = {}
    for record in dbc.records:
        duration_id = record[0]
        base_duration = record[1]  # milliseconds
        per_level = record[2]
        max_duration = record[3]
        duration_map[duration_id] = {
            'base': base_duration,
            'per_level': per_level,
            'max': max_duration
        }
    
    print(f"  Loaded {len(duration_map)} durations")
    return duration_map


def load_spell_cast_times(dbc_path: Path) -> dict:
    """Load SpellCastTimes.dbc"""
    cast_file = dbc_path / 'SpellCastTimes.dbc'
    if not cast_file.exists():
        return {}
    
    print("Loading SpellCastTimes.dbc...")
    dbc = DBCReader(cast_file)
    
    cast_map = {}
    for record in dbc.records:
        cast_id = record[0]
        cast_time = record[1]  # milliseconds
        cast_map[cast_id] = cast_time
    
    print(f"  Loaded {len(cast_map)} cast times")
    return cast_map


def load_spell_ranges(dbc_path: Path) -> dict:
    """Load SpellRange.dbc"""
    range_file = dbc_path / 'SpellRange.dbc'
    if not range_file.exists():
        return {}
    
    print("Loading SpellRange.dbc...")
    dbc = DBCReader(range_file)
    
    range_map = {}
    for record in dbc.records:
        range_id = record[0]
        min_range = dbc.get_float(record[1])
        max_range = dbc.get_float(record[2])
        range_map[range_id] = {
            'min': min_range,
            'max': max_range
        }
    
    print(f"  Loaded {len(range_map)} ranges")
    return range_map


def create_complete_spell_dataframe(dbc_path: Path) -> pd.DataFrame:
    """
    Extract ALL meaningful spell fields from Spell.dbc
    Based on wowdev.wiki 1.12 field structure
    """
    print("\nLoading Spell.dbc...")
    dbc = DBCReader(dbc_path / 'Spell.dbc')
    print(f"  Total records: {len(dbc.records)}")
    
    # Load reference DBCs
    icon_map = load_spell_icons(dbc_path)
    duration_map = load_spell_durations(dbc_path)
    cast_time_map = load_spell_cast_times(dbc_path)
    range_map = load_spell_ranges(dbc_path)
    
    print("\nExtracting complete spell data...")
    
    clean_data = []
    
    for record in dbc.records:
        spell_id = record[0]
        
        # Skip invalid IDs
        if spell_id == 0 or spell_id > 100000:
            continue
        
        # Names and descriptions (English = locale 0)
        name = dbc.get_string(record[120]) if len(record) > 120 else ""
        rank = dbc.get_string(record[133]) if len(record) > 133 else ""
        description = dbc.get_string(record[138]) if len(record) > 138 else ""
        tooltip = dbc.get_string(record[142]) if len(record) > 142 else ""
        
        # Skip empty names
        if not name or len(name) < 2:
            continue
        
        # Basic properties
        school_id = record[1] if len(record) > 1 else 0
        category = record[2] if len(record) > 2 else 0
        dispel_type_id = record[4] if len(record) > 4 else 0
        mechanic_id = record[5] if len(record) > 5 else 0
        
        # Attributes (flags)
        attributes = record[6] if len(record) > 6 else 0
        attributes_ex = record[7] if len(record) > 7 else 0
        
        # Cast properties
        cast_time_id = record[18] if len(record) > 18 else 0
        cast_time_ms = cast_time_map.get(cast_time_id, 0)
        
        cooldown = record[19] if len(record) > 19 else 0
        category_recovery = record[20] if len(record) > 20 else 0
        
        # Icons
        icon_id = record[21] if len(record) > 21 else 0
        if icon_id not in icon_map and len(record) > 22:
            icon_id = record[22]
        icon_name = icon_map.get(icon_id)
        
        # Power/resource costs
        power_type_id = record[23] if len(record) > 23 else 0
        mana_cost = record[24] if len(record) > 24 else 0
        mana_per_second = record[25] if len(record) > 25 else 0
        
        # Range
        range_id = record[27] if len(record) > 27 else 0
        range_info = range_map.get(range_id, {'min': 0, 'max': 0})
        
        # Speed/projectile
        speed = dbc.get_float(record[28]) if len(record) > 28 else 0.0
        
        # Target restrictions
        targets = record[30] if len(record) > 30 else 0
        target_creature_type = record[31] if len(record) > 31 else 0
        
        # Focus object requirement
        requires_focus_object = record[32] if len(record) > 32 else 0
        
        # Duration
        duration_id = record[34] if len(record) > 34 else 0
        duration_info = duration_map.get(duration_id, {'base': 0, 'per_level': 0, 'max': 0})
        
        # Interrupt flags
        interrupt_flags = record[35] if len(record) > 35 else 0
        aura_interrupt_flags = record[36] if len(record) > 36 else 0
        channel_interrupt_flags = record[37] if len(record) > 37 else 0
        
        # Reagents (spell components)
        reagent_1_id = record[49] if len(record) > 49 else 0
        reagent_1_count = record[50] if len(record) > 50 else 0
        reagent_2_id = record[51] if len(record) > 51 else 0
        reagent_2_count = record[52] if len(record) > 52 else 0
        
        # Equipped items required
        equipped_item_class = record[57] if len(record) > 57 else -1
        equipped_item_subclass_mask = record[58] if len(record) > 58 else 0
        equipped_item_inventory_type_mask = record[59] if len(record) > 59 else 0
        
        # Effects (there are 3 effects per spell)
        effect_1_id = record[60] if len(record) > 60 else 0
        effect_2_id = record[61] if len(record) > 61 else 0
        effect_3_id = record[62] if len(record) > 62 else 0
        
        # Effect base points (actual damage/heal amounts)
        effect_1_base_points = record[66] if len(record) > 66 else 0
        effect_2_base_points = record[67] if len(record) > 67 else 0
        effect_3_base_points = record[68] if len(record) > 68 else 0
        
        # Effect multipliers
        effect_1_multiplier = dbc.get_float(record[84]) if len(record) > 84 else 1.0
        effect_2_multiplier = dbc.get_float(record[85]) if len(record) > 85 else 1.0
        effect_3_multiplier = dbc.get_float(record[86]) if len(record) > 86 else 1.0
        
        # Effect radius
        effect_1_radius_idx = record[78] if len(record) > 78 else 0
        effect_2_radius_idx = record[79] if len(record) > 79 else 0
        effect_3_radius_idx = record[80] if len(record) > 80 else 0
        
        # Triggered spells
        effect_1_trigger_spell = record[113] if len(record) > 113 else 0
        effect_2_trigger_spell = record[114] if len(record) > 114 else 0
        effect_3_trigger_spell = record[115] if len(record) > 115 else 0
        
        # Spell level requirements
        base_level = record[163] if len(record) > 163 else 0
        spell_level = record[164] if len(record) > 164 else 0
        max_target_level = record[165] if len(record) > 165 else 0
        
        # Class/category info
        spell_family = record[166] if len(record) > 166 else 0
        max_targets = record[168] if len(record) > 168 else 0
        dmg_class = record[170] if len(record) > 170 else 0  # 0=None, 1=Magic, 2=Melee, 3=Ranged
        
        # Damage multipliers
        dmg_multiplier_1 = dbc.get_float(record[173]) if len(record) > 173 else 1.0
        dmg_multiplier_2 = dbc.get_float(record[174]) if len(record) > 174 else 1.0
        dmg_multiplier_3 = dbc.get_float(record[175]) if len(record) > 175 else 1.0
        
        clean_data.append({
            # Basic info
            'spell_id': spell_id,
            'name': name,
            'rank': rank if rank else None,
            'description': description if description else None,
            'tooltip': tooltip if tooltip else None,
            
            # School and mechanics
            'school': SPELL_SCHOOLS.get(school_id, f"Unknown({school_id})"),
            'school_id': school_id,
            'dispel_type': DISPEL_TYPES.get(dispel_type_id, f"Unknown({dispel_type_id})"),
            'mechanic': SPELL_MECHANICS.get(mechanic_id, f"Unknown({mechanic_id})") if mechanic_id else None,
            
            # Casting
            'cast_time_ms': cast_time_ms,
            'cast_time_sec': cast_time_ms / 1000 if cast_time_ms else 0,
            'cooldown_ms': cooldown,
            'cooldown_sec': cooldown / 1000 if cooldown else 0,
            'category_cooldown_ms': category_recovery,
            
            # Icon
            'icon_id': icon_id if icon_id > 0 else None,
            'icon_name': icon_name,
            
            # Power costs
            'power_type': POWER_TYPES.get(power_type_id, f"Unknown({power_type_id})"),
            'mana_cost': mana_cost if mana_cost else None,
            'mana_per_second': mana_per_second if mana_per_second else None,
            
            # Range
            'range_min': range_info['min'],
            'range_max': range_info['max'],
            'speed': speed if speed else None,
            
            # Duration
            'duration_ms': duration_info['base'],
            'duration_sec': duration_info['base'] / 1000 if duration_info['base'] else 0,
            'duration_per_level': duration_info['per_level'],
            'max_duration_ms': duration_info['max'],
            
            # Requirements
            'requires_focus_object': requires_focus_object if requires_focus_object else None,
            'equipped_item_class': equipped_item_class if equipped_item_class >= 0 else None,
            
            # Reagents
            'reagent_1_id': reagent_1_id if reagent_1_id else None,
            'reagent_1_count': reagent_1_count if reagent_1_count else None,
            'reagent_2_id': reagent_2_id if reagent_2_id else None,
            'reagent_2_count': reagent_2_count if reagent_2_count else None,
            
            # Effects
            'effect_1_id': effect_1_id if effect_1_id else None,
            'effect_1_base_points': effect_1_base_points,
            'effect_1_multiplier': effect_1_multiplier,
            'effect_1_trigger_spell': effect_1_trigger_spell if effect_1_trigger_spell else None,
            
            'effect_2_id': effect_2_id if effect_2_id else None,
            'effect_2_base_points': effect_2_base_points,
            'effect_2_multiplier': effect_2_multiplier,
            'effect_2_trigger_spell': effect_2_trigger_spell if effect_2_trigger_spell else None,
            
            'effect_3_id': effect_3_id if effect_3_id else None,
            'effect_3_base_points': effect_3_base_points,
            'effect_3_multiplier': effect_3_multiplier,
            'effect_3_trigger_spell': effect_3_trigger_spell if effect_3_trigger_spell else None,
            
            # Level requirements
            'base_level': base_level if base_level else None,
            'spell_level': spell_level if spell_level else None,
            'max_target_level': max_target_level if max_target_level else None,
            
            # Damage info
            'dmg_class': dmg_class,
            'dmg_class_name': ['None', 'Magic', 'Melee', 'Ranged'][dmg_class] if dmg_class <= 3 else 'Unknown',
            'max_targets': max_targets if max_targets else None,
            
            # Flags
            'attributes': attributes,
            'attributes_ex': attributes_ex,
            'interrupt_flags': interrupt_flags,
            'aura_interrupt_flags': aura_interrupt_flags,
            
            # Quality flags
            'has_old_tag': '(OLD)' in name,
            'has_test_tag': any(x in name.upper() for x in ['TEST', 'NYI', 'DND', 'UNUSED', 'DEPRECATED'])
        })
    
    df = pd.DataFrame(clean_data)
    print(f"  Extracted {len(df)} valid spells with complete data")
    
    return df


def show_stats(df: pd.DataFrame):
    """Show comprehensive statistics"""
    print("\n" + "="*80)
    print("COMPLETE SPELL DATA STATISTICS")
    print("="*80)
    
    print(f"\nTotal spells: {len(df)}")
    print(f"Clean spells (no OLD/TEST): {(~df['has_old_tag'] & ~df['has_test_tag']).sum()}")
    
    print(f"\n--- Data Completeness ---")
    print(f"With icons: {df['icon_name'].notna().sum()}")
    print(f"With ranks: {df['rank'].notna().sum()}")
    print(f"With descriptions: {df['description'].notna().sum()}")
    print(f"With tooltips: {df['tooltip'].notna().sum()}")
    print(f"With mana cost: {df['mana_cost'].notna().sum()}")
    print(f"With cooldown: {(df['cooldown_sec'] > 0).sum()}")
    print(f"With cast time: {(df['cast_time_sec'] > 0).sum()}")
    print(f"With duration: {(df['duration_sec'] > 0).sum()}")
    print(f"With range: {(df['range_max'] > 0).sum()}")
    print(f"With reagents: {df['reagent_1_id'].notna().sum()}")
    
    print(f"\n--- School Distribution ---")
    print(df['school'].value_counts().head(10))
    
    print(f"\n--- Power Type Distribution ---")
    print(df['power_type'].value_counts())
    
    print(f"\n--- Damage Class Distribution ---")
    print(df['dmg_class_name'].value_counts())


def show_sample_queries(df: pd.DataFrame):
    """Show sample queries with rich data"""
    print("\n" + "="*80)
    print("SAMPLE QUERIES - COMPLETE DATA")
    print("="*80)
    
    # Fireball with all data
    print("\n1. Fireball (Rank 1) - Complete Data:")
    print("-" * 80)
    fireball = df[df['spell_id'] == 133].iloc[0]
    for key, value in fireball.items():
        if value is not None and value != 0 and value != "":
            print(f"  {key:30s}: {value}")
    
    # Mage spells with costs
    print("\n2. First 10 Fire school spells with mana costs:")
    print("-" * 80)
    fire_spells = df[(df['school'] == 'Fire') & (df['mana_cost'].notna()) & 
                     (~df['has_old_tag']) & (~df['has_test_tag'])].head(10)
    print(fire_spells[['spell_id', 'name', 'rank', 'mana_cost', 'cast_time_sec', 
                       'cooldown_sec', 'range_max']].to_string(index=False))
    
    # Instant cast spells
    print("\n3. First 10 instant cast spells:")
    print("-" * 80)
    instant = df[(df['cast_time_sec'] == 0) & (~df['has_old_tag']) & 
                 (~df['has_test_tag'])].head(10)
    print(instant[['spell_id', 'name', 'school', 'mana_cost', 'cooldown_sec']].to_string(index=False))
    
    # Spells with reagents
    print("\n4. First 10 spells requiring reagents:")
    print("-" * 80)
    reagents = df[df['reagent_1_id'].notna()].head(10)
    print(reagents[['spell_id', 'name', 'reagent_1_id', 'reagent_1_count', 
                    'reagent_2_id', 'reagent_2_count']].to_string(index=False))


def main():
    dbc_path = Path('game-data/DBFilesClient/')
    
    if not dbc_path.exists():
        print(f"ERROR: {dbc_path} not found")
        return
    
    print("="*80)
    print("WoW 1.12 Complete Spell Data Extractor")
    print("="*80)
    
    # Extract complete data
    spell_df = create_complete_spell_dataframe(dbc_path)
    
    # Show statistics
    show_stats(spell_df)
    
    # Show samples
    show_sample_queries(spell_df)
    
    print("\n" + "="*80)
    print("EXPORT OPTIONS")
    print("="*80)
    print("\nDataFrame saved to: spell_df")
    print("\nExport examples:")
    print("  # Export everything to JSON")
    print("  spell_df.to_json('spells_complete.json', orient='records', indent=2)")
    print()
    print("  # Export clean spells only")
    print("  clean = spell_df[~spell_df['has_old_tag'] & ~spell_df['has_test_tag']]")
    print("  clean.to_json('spells_clean.json', orient='records', indent=2)")
    print()
    print("  # Export to CSV for Excel")
    print("  spell_df.to_csv('spells_complete.csv', index=False)")
    print()
    print("  # Filter specific schools")
    print("  fire_spells = spell_df[spell_df['school'] == 'Fire']")
    print("  fire_spells.to_json('fire_spells.json', orient='records', indent=2)")
    
    return spell_df


if __name__ == "__main__":
    spell_df = main()