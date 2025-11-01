import os
import struct
import json

class ItemCacheParser:
    def __init__(self, wdb_path):
        self.wdb_path = wdb_path
        self.records = []
        self.items = {}
        
        # Stat type mappings (these are typical WoW stat IDs)
        self.stat_types = {
            3: "Agility",
            4: "Strength", 
            5: "Intellect",
            6: "Spirit",
            7: "Stamina",
            12: "Defense",
            13: "Dodge",
            14: "Parry",
            15: "Block",
            16: "Hit",
            17: "Crit",
            18: "Hit Avoidance",
            19: "Crit Avoidance",
            20: "Resilience",
            21: "Haste",
            22: "Expertise",
            23: "Attack Power",
            24: "Ranged Attack Power",
            25: "Spell Power",
            26: "Spell Penetration",
            27: "Mana Regeneration",
            28: "Armor Penetration",
            29: "Spell Power",
            30: "Bonus Armor",
            31: "Fire Resistance",
            32: "Nature Resistance", 
            33: "Frost Resistance",
            34: "Shadow Resistance",
            35: "Arcane Resistance",
            36: "All Resistances",
        }
        
    def parse(self):
        """Parse the itemcache.wdb file"""
        print(f"Parsing {self.wdb_path}...")
        
        with open(self.wdb_path, 'rb') as f:
            # Skip header (we know the structure now)
            f.seek(32)  # 32-byte header
            
            # Read all records (5875 records of 468 bytes each)
            for i in range(5875):
                record_data = f.read(468)
                if len(record_data) < 468:
                    break
                self.records.append(record_data)
                
                # Parse item from record
                item = self.parse_item_record(record_data, i)
                if item and item.get('entry'):
                    self.items[item['entry']] = item
        
        print(f"Parsed {len(self.items)} items")
        return self.items
    
    def parse_item_record(self, record_data, record_index):
        """Parse a single item record"""
        item = {'record_index': record_index}
        
        # Extract fields based on observed structure
        # Item ID at offset 64
        item['entry'] = struct.unpack('<I', record_data[64:68])[0]
        
        # Quality at offset 28
        item['quality'] = struct.unpack('<I', record_data[28:32])[0]
        
        # Class and subclass at offsets 32, 36
        item['class'] = struct.unpack('<I', record_data[32:36])[0]
        item['subclass'] = struct.unpack('<I', record_data[36:40])[0]
        
        # Display ID at offset 48
        item['display_id'] = struct.unpack('<I', record_data[48:52])[0]
        
        # Inventory type at offset 52
        item['inventory_type'] = struct.unpack('<I', record_data[52:56])[0]
        
        # Required level at offset 56  
        item['required_level'] = struct.unpack('<I', record_data[56:60])[0]
        
        # Item level at offset 60
        item['item_level'] = struct.unpack('<I', record_data[60:64])[0]
        
        # Extract name - it's stored as raw UTF-8 in the record
        name = self.extract_item_name(record_data)
        if name:
            item['name'] = name
        
        # Extract stats (stat types and values) - FIXED VERSION
        stats = self.extract_item_stats_fixed(record_data)
        if stats:
            item['stats'] = stats
            
        # Extract spells (like Thunderfury's proc)
        spells = self.extract_item_spells(record_data)
        if spells:
            item['spells'] = spells
            
        # Extract damage information for weapons
        damage_info = self.extract_weapon_damage(record_data)
        if damage_info:
            item['damage'] = damage_info
            
        return item
    
    def extract_item_name(self, record_data):
        """Extract item name from record data"""
        # Look for null-terminated UTF-8 strings in the record
        try:
            # The name appears multiple times in the record, find the clean one
            for i in range(80, 200, 4):
                if record_data[i] == 0:
                    continue
                    
                # Try to extract null-terminated string
                end = i
                while end < len(record_data) and record_data[end] != 0:
                    end += 1
                
                if end > i + 10:  # Reasonable name length
                    string_data = record_data[i:end]
                    try:
                        name = string_data.decode('utf-8')
                        # Check if it looks like an item name
                        if (len(name) > 3 and 
                            any(c.isalpha() for c in name) and
                            'Thunderfury' in name or 'Ashbringer' in name or ' of ' in name):
                            return name
                    except UnicodeDecodeError:
                        pass
        except Exception as e:
            pass
            
        return None
    
    def extract_item_stats_fixed(self, record_data):
        """Extract item stats from record - FIXED VERSION"""
        stats = []
        
        # Stats typically start around offset 140-200 in WDB files
        # Each stat is 8 bytes: stat_type (4 bytes) + stat_value (4 bytes)
        for offset in range(140, 250, 8):
            if offset + 8 > len(record_data):
                break
                
            stat_type = struct.unpack('<I', record_data[offset:offset+4])[0]
            stat_value = struct.unpack('<i', record_data[offset+4:offset+8])[0]  # Signed integer!
            
            # Filter out garbage values
            if (1 <= stat_type <= 50 or 31 <= stat_type <= 36) and -1000 <= stat_value <= 1000:
                stat_name = self.stat_types.get(stat_type, f"Stat_{stat_type}")
                stats.append({
                    'type': stat_type,
                    'name': stat_name,
                    'value': stat_value
                })
        
        return stats if stats else None
    
    def extract_weapon_damage(self, record_data):
        """Extract weapon damage information"""
        damage_info = {}
        
        # Damage min/max might be around offsets 100-140
        # Try common offsets for damage values
        for offset in [100, 104, 108, 112, 116, 120]:
            if offset + 4 <= len(record_data):
                value = struct.unpack('<I', record_data[offset:offset+4])[0]
                if 1 <= value <= 500:  # Reasonable damage range
                    if 'damage_min' not in damage_info:
                        damage_info['damage_min'] = value
                    elif 'damage_max' not in damage_info:
                        damage_info['damage_max'] = value
        
        # Try to find weapon speed
        for offset in [124, 128, 132, 136]:
            if offset + 4 <= len(record_data):
                value = struct.unpack('<f', record_data[offset:offset+4])[0]  # Float for speed
                if 0.5 <= value <= 5.0:  # Reasonable weapon speed
                    damage_info['speed'] = round(value, 2)
                    break
        
        return damage_info if damage_info else None
    
    def extract_item_spells(self, record_data):
        """Extract spell effects from item"""
        spells = []
        
        # Spell IDs typically around offset 68-100
        for offset in range(68, 100, 4):
            if offset + 4 > len(record_data):
                break
                
            spell_id = struct.unpack('<I', record_data[offset:offset+4])[0]
            if 1 <= spell_id <= 50000:  # Reasonable spell ID range
                spells.append(spell_id)
        
        return spells if spells else None
    
    def find_item_by_id(self, item_id):
        """Find specific item by ID"""
        return self.items.get(item_id)
    
    def find_item_by_name(self, name):
        """Find items by name"""
        return [item for item in self.items.values() 
                if item.get('name') and name.lower() in item['name'].lower()]
    
    def save_to_json(self, output_path):
        """Save parsed items to JSON"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.items, f, indent=2, ensure_ascii=False)
        print(f"Saved {len(self.items)} items to {output_path}")

# Test with Thunderfury - FIXED VERSION
def test_thunderfury_parser():
    parser = ItemCacheParser("game-data/WDB/itemcache.wdb")
    items = parser.parse()
    
    # Find Thunderfury
    thunderfury = parser.find_item_by_id(19019)
    if thunderfury:
        print("\n🎯 THUNDERFURY FOUND!")
        print(f"Name: {thunderfury.get('name', 'Unknown')}")
        print(f"Entry: {thunderfury.get('entry')}")
        print(f"Quality: {thunderfury.get('quality')}")
        print(f"Class: {thunderfury.get('class')} (2=Weapon, 3=Armor)")
        print(f"Subclass: {thunderfury.get('subclass')} (0=Sword for weapons)")
        print(f"Item Level: {thunderfury.get('item_level')}")
        print(f"Required Level: {thunderfury.get('required_level')}")
        print(f"Display ID: {thunderfury.get('display_id')}")
        
        if thunderfury.get('damage'):
            print("Weapon Damage:")
            for key, value in thunderfury['damage'].items():
                print(f"  {key}: {value}")
        
        if thunderfury.get('stats'):
            print("Stats:")
            for stat in thunderfury['stats']:
                print(f"  {stat['name']}: {stat['value']}")
                
        if thunderfury.get('spells'):
            print(f"Spell Effects: {thunderfury['spells']}")
            
        # Show raw hex around stat area for debugging
        print("\nRaw data around stat area (offsets 140-200):")
        record_data = parser.records[thunderfury['record_index']]
        for offset in range(140, 200, 16):
            hex_str = record_data[offset:offset+16].hex()
            values = [struct.unpack('<I', record_data[offset+i:offset+i+4])[0] for i in range(0, 16, 4)]
            print(f"  {offset:3d}: {hex_str} -> {values}")
    
    # Test with a simple item to verify stat parsing
    simple_item = parser.find_item_by_id(2586)  # Some common item
    if simple_item and simple_item.get('stats'):
        print(f"\nSimple item test ({simple_item.get('name')}):")
        for stat in simple_item['stats']:
            print(f"  {stat['name']}: {stat['value']}")
    
    # Save all items to JSON
    parser.save_to_json("game-data/items_fixed.json")
    
    return parser

# Run the test
if __name__ == "__main__":
    parser = test_thunderfury_parser()