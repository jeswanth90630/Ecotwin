from PIL import Image

def extract_data(image_path):
    img = Image.open(image_path).convert('RGB')
    pixels = list(img.getdata())
    
    binary_data = ""
    for pixel in pixels:
        for i in range(3): # R, G, B channels
            binary_data += str(pixel[i] & 1)
            
            # Check for delimiter '1111111111111110' at each step if performance isn't a priority,
            # or just accumulate and look back once we have enough bits.
            if len(binary_data) >= 16 and binary_data.endswith('1111111111111110'):
                # Extract the message from binary string
                cleaned_binary = binary_data[:-16]
                chars = [cleaned_binary[i:i+8] for i in range(0, len(cleaned_binary), 8)]
                message = "".join(chr(int(c, 2)) for c in chars)
                return message
                
    return "" # No hidden message found or incorrect image