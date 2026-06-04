import base64

def decode_wotlk_profession(base64_bits):
    # Pad the string with '=' if its length isn't a multiple of 4
    missing_padding = len(base64_bits) % 4
    if missing_padding:
        base64_bits += '=' * (4 - missing_padding)
        
    # Decode Base64 string into raw binary bytes
    raw_bytes = base64.b64decode(base64_bits)
    
    known_recipe_indices = []
    
    # Loop through every byte in the decoded array
    for byte_idx, byte_val in enumerate(raw_bytes):
        # Look at all 8 bits of the byte
        for bit_position in range(8):
            # Check if the bit is flipped to 1
            if (byte_val & (1 << bit_position)) != 0:
                # Calculate the global sequential index of the recipe
                global_index = (byte_idx * 8) + bit_position
                known_recipe_indices.append(global_index)
                
    return known_recipe_indices

# Test it with Azzco's Jewelcrafting data
azzco_jc = "8/7Vu6MtJyjpmMHAACAwHAAAg/Bg/vBAAAAAAA+BAAAA6/37v77e2/1ejjbG3QtRXOH5i34GCAA+/D8Pg/BAAAAAAAAAAAA"
indices = decode_wotlk_profession(azzco_jc)

print(f"Azzco knows {len(indices)} recipes.")
print(f"First few recipe indices: {indices[:10]}")