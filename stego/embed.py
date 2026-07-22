from PIL import Image

def embed_data(image_path, data, output_path):
    img = Image.open(image_path).convert('RGB') # Ensure RGB mode
    # Binary data with delimiter: chr(255) + chr(254) -> 11111111 11111110
    binary_data = ''.join(format(ord(i), '08b') for i in data) + '1111111111111110'
    
    total_pixels = img.width * img.height
    if len(binary_data) > total_pixels * 3:
        raise ValueError(f"Image too small. Content needs {len(binary_data)} bits, but image only provides {total_pixels * 3} bits.")

    pixels = list(img.getdata())
    new_pixels = []
    index = 0

    for pixel in pixels:
        pixel_list = list(pixel)
        for i in range(3): # For R, G, B channels
            if index < len(binary_data):
                pixel_list[i] = (pixel_list[i] & ~1) | int(binary_data[index])
                index += 1
        new_pixels.append(tuple(pixel_list))
        
        if index >= len(binary_data):
            # Fill the rest of the pixels as is
            new_pixels.extend(pixels[len(new_pixels):])
            break

    new_img = Image.new(img.mode, img.size)
    new_img.putdata(new_pixels)
    new_img.save(output_path)