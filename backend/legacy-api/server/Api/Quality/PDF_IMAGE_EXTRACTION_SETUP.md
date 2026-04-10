# PDF Image Extraction Setup

## Backend Requirements

The PDF image extraction endpoint requires one of the following:

### Option 1: Poppler Utils (Recommended - Most Reliable)

**Windows:**
1. Download poppler for Windows: https://github.com/oschwartz10612/poppler-windows/releases
2. Extract to `C:\poppler\`
3. Add `C:\poppler\Library\bin\` to your system PATH
4. Or extract to any location and update the `findPdfImagesExecutable()` function in `pdf-extract-images.php`

**Linux/Ubuntu:**
```bash
sudo apt-get update
sudo apt-get install poppler-utils
```

**macOS:**
```bash
brew install poppler
```

**Verify Installation:**
```bash
pdfimages --version
```

### Option 2: PHP Imagick Extension (Fallback)

**Windows (XAMPP/WAMP):**
1. Ensure ImageMagick is installed
2. Enable `php_imagick.dll` in `php.ini`
3. Restart Apache

**Linux/Ubuntu:**
```bash
sudo apt-get install php-imagick imagemagick
sudo systemctl restart apache2
```

**Verify:**
```bash
php -m | grep imagick
```

## Testing

### Test Backend Endpoint

```bash
# Using curl
curl -X POST -F "pdf=@path/to/test.pdf" http://localhost/api/quality/pdf-extract-images.php
```

### Test from Angular

1. Start your Angular dev server
2. Navigate to checklist template editor
3. Click "Import from PDF"
4. Select a PDF with images
5. Check browser console for:
   - "🖼️ Sending PDF to backend for image extraction..."
   - "✅ Backend extracted X images"

## Troubleshooting

### No images extracted (Method 1: pdfimages)
- Check if pdfimages is installed: `pdfimages --version`
- Check PHP error logs for permission issues
- Verify temp directory is writable: `sys_get_temp_dir()`

### No images extracted (Method 2: Imagick)
- Check if extension is loaded: `php -m | grep imagick`
- Check ImageMagick policies in `/etc/ImageMagick-6/policy.xml` (Linux)
- PDF rights might be restricted - add to policy.xml:
  ```xml
  <policy domain="coder" rights="read|write" pattern="PDF" />
  ```

### CORS Errors
- The endpoint already has CORS headers enabled
- If still blocked, check your Apache/Nginx configuration

### Large Files
- Increase PHP upload limits in `php.ini`:
  ```ini
  upload_max_filesize = 50M
  post_max_size = 50M
  max_execution_time = 300
  memory_limit = 256M
  ```

## How It Works

1. Angular uploads PDF to backend endpoint
2. Backend uses `pdfimages` to extract all embedded images to temp directory
3. Images are filtered (removes small logos/icons < 50x50)
4. Each image is converted to base64 data URL
5. Array of base64 images returned to Angular
6. Angular distributes images to checklist items

## API Response Format

```json
{
  "success": true,
  "images": [
    {
      "url": "data:image/jpeg;base64,/9j/4AAQ...",
      "width": 800,
      "height": 600,
      "size": 45678
    }
  ],
  "count": 3,
  "method": "extraction"
}
```
