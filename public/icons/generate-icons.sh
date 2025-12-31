#!/bin/bash

# Script to generate PWA icons from the new logo
# This script uses macOS built-in sips tool

SOURCE_LOGO="20251231_2237_Futuristic Accounting Logo_simple_compose_01kdtp0xjcevgagz6g1d1w3055.png"

echo "🎨 Generating PWA icons from: $SOURCE_LOGO"

# Check if source logo exists
if [ ! -f "$SOURCE_LOGO" ]; then
    echo "❌ Error: Source logo file not found: $SOURCE_LOGO"
    exit 1
fi

# Generate icon-192x192.png
echo "📱 Creating icon-192x192.png..."
sips -z 192 192 "$SOURCE_LOGO" --out "icon-192x192.png"
if [ $? -eq 0 ]; then
    echo "✅ Created icon-192x192.png"
else
    echo "❌ Failed to create icon-192x192.png"
    exit 1
fi

# Generate icon-512x512.png
echo "📱 Creating icon-512x512.png..."
sips -z 512 512 "$SOURCE_LOGO" --out "icon-512x512.png"
if [ $? -eq 0 ]; then
    echo "✅ Created icon-512x512.png"
else
    echo "❌ Failed to create icon-512x512.png"
    exit 1
fi

# Generate apple-touch-icon.png (180x180 for iOS)
echo "🍎 Creating apple-touch-icon.png..."
sips -z 180 180 "$SOURCE_LOGO" --out "apple-touch-icon.png"
if [ $? -eq 0 ]; then
    echo "✅ Created apple-touch-icon.png"
else
    echo "❌ Failed to create apple-touch-icon.png"
    exit 1
fi

# Generate favicon.ico (32x32)
echo "🔖 Creating favicon.ico..."
sips -z 32 32 "$SOURCE_LOGO" --out "favicon-temp.png"
# Convert PNG to ICO (if imagemagick is available, otherwise keep as PNG)
if command -v convert &> /dev/null; then
    convert favicon-temp.png favicon.ico
    rm favicon-temp.png
    echo "✅ Created favicon.ico"
else
    mv favicon-temp.png favicon-32x32.png
    echo "✅ Created favicon-32x32.png (install ImageMagick for .ico conversion)"
fi

echo ""
echo "🎉 All icons generated successfully!"
echo ""
echo "Generated files:"
echo "  - icon-192x192.png (192x192)"
echo "  - icon-512x512.png (512x512)"
echo "  - apple-touch-icon.png (180x180)"
if [ -f "favicon.ico" ]; then
    echo "  - favicon.ico (32x32)"
else
    echo "  - favicon-32x32.png (32x32)"
fi

