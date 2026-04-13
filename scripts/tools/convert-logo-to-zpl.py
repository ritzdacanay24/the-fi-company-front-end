"""
Convert PNG logo to ZPL ^GF (Graphic Field) format
This creates embedded ZPL graphic data that can be copied directly into ZPL code

Requirements:
  pip install pillow

Usage:
  python convert-logo-to-zpl.py
"""

from PIL import Image
import math

def image_to_zpl(image_path, dpi=203, threshold=128):
    """
    Convert image to ZPL ^GF command
    
    Args:
        image_path: Path to PNG image file
        dpi: Printer DPI (203 or 300)
        threshold: Brightness threshold for black/white (0-255)
    
    Returns:
        ZPL string with ^GF command
    """
    # Open and convert to grayscale
    img = Image.open(image_path).convert('L')
    
    # Resize if needed (optional - adjust max_width as needed)
    max_width = 400  # pixels at 203 DPI = ~2 inches
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
    
    width, height = img.size
    
    # Convert to black and white bitmap
    pixels = img.load()
    
    # Calculate bytes per row (must be multiple of 8 bits)
    bytes_per_row = math.ceil(width / 8)
    total_bytes = bytes_per_row * height
    
    # Convert pixels to hex string
    hex_data = []
    for y in range(height):
        row_bits = []
        for x in range(width):
            # Black pixel if below threshold, white if above
            pixel_value = pixels[x, y]
            row_bits.append('1' if pixel_value < threshold else '0')
        
        # Pad row to complete byte boundary
        while len(row_bits) % 8 != 0:
            row_bits.append('0')
        
        # Convert bits to hex bytes
        for i in range(0, len(row_bits), 8):
            byte_bits = row_bits[i:i+8]
            byte_value = int(''.join(byte_bits), 2)
            hex_data.append(f'{byte_value:02X}')
    
    # Build ZPL ^GF command
    # Format: ^GF{format},{total_bytes},{bytes_per_row},{data}
    # A = ASCII hex, B = Binary
    hex_string = ''.join(hex_data)
    
    zpl_command = f"^GFA,{total_bytes},{total_bytes},{bytes_per_row},{hex_string}"
    
    print(f"Image dimensions: {width}x{height} pixels")
    print(f"Bytes per row: {bytes_per_row}")
    print(f"Total bytes: {total_bytes}")
    print(f"Hex data length: {len(hex_string)} characters")
    print("\n" + "="*80)
    print("ZPL GRAPHIC FIELD COMMAND (Copy this into your ZPL code):")
    print("="*80)
    print(zpl_command)
    print("\n" + "="*80)
    print("USAGE EXAMPLE:")
    print("="*80)
    print(f"^FO50,20  (position: x=50, y=20)")
    print(zpl_command)
    print("^FS  (end of field)")
    
    # Save to file
    output_file = 'logo-zpl-graphic.txt'
    with open(output_file, 'w') as f:
        f.write(f"Image: {width}x{height} pixels\n")
        f.write(f"Total bytes: {total_bytes}\n\n")
        f.write("ZPL COMMAND:\n")
        f.write(zpl_command + "\n\n")
        f.write("USAGE:\n")
        f.write("^FO50,20\n")
        f.write(zpl_command + "\n")
        f.write("^FS\n")
    
    print(f"\nOutput saved to: {output_file}")
    
    return zpl_command

if __name__ == "__main__":
    # Convert the FI Company logo
    logo_path = "src/assets/images/the-fi.png"
    
    try:
        zpl_graphic = image_to_zpl(logo_path, dpi=203, threshold=128)
    except FileNotFoundError:
        print(f"Error: Could not find {logo_path}")
        print("Make sure the file exists in the project.")
    except Exception as e:
        print(f"Error converting image: {e}")
