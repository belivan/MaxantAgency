import re
import os

# Define the files and their source metadata
analyzers = [
    ('analyzers/seo-analyzer.js', 'seo-analyzer', 'technical'),
    ('analyzers/content-analyzer.js', 'content-analyzer', 'technical'),
    ('analyzers/accessibility-analyzer.js', 'accessibility-analyzer', 'accessibility'),
    ('analyzers/social-analyzer.js', 'social-analyzer', 'social'),
    ('analyzers/desktop-visual-analyzer.js', 'desktop-visual-analyzer', 'visual'),
    ('analyzers/mobile-visual-analyzer.js', 'mobile-visual-analyzer', 'visual'),
    ('analyzers/unified-visual-analyzer.js', 'unified-visual-analyzer', 'visual'),
    ('analyzers/unified-technical-analyzer.js', 'unified-technical-analyzer', 'technical'),
]

for filename, source, source_type in analyzers:
    filepath = filename
    if not os.path.exists(filepath):
        print(f'Skipped {filename} - file not found')
        continue

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Skip if already has source fields
        if f"source: '{source}'" in content:
            print(f'Skipped {filename} - already has source fields')
            continue

        # Pattern to find issues.push({ ... }) blocks with priority field
        # Match: priority: 'value' followed by closing brace (with possible whitespace/newlines)
        pattern = r"(priority:\s*['\"](?:critical|high|medium|low)['\"])([\s\n]*})"
        replacement = r"\1,\n      source: '" + source + r"',\n      source_type: '" + source_type + r"'\2"

        updated_content = re.sub(pattern, replacement, content)

        # Also handle recommendation or technical_details as last field
        pattern2 = r"((?:recommendation|technical_details):\s*(?:['\"].*?['\"]|`.*?`))([\s\n]*})"
        replacement2 = r"\1,\n      source: '" + source + r"',\n      source_type: '" + source_type + r"'\2"
        updated_content = re.sub(pattern2, replacement2, updated_content)

        if updated_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            print(f'Updated {filename} - added source fields')
        else:
            print(f'No changes needed for {filename}')

    except Exception as e:
        print(f'Error processing {filename}: {e}')

print('Done!')
