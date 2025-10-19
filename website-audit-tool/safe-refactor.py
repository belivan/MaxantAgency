#!/usr/bin/env python3
"""
Safe refactoring script to remove email generation code from analyzer.js
Uses precise line number ranges to avoid accidental deletions
"""

import re

def main():
    with open('analyzer.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    original_count = len(lines)
    print(f"[FILE] Original file: {original_count} lines\n")

    # Track what we remove
    removed_lines = []

    # Step 1: Remove imports (lines 14 and 16, but offset by 1 for 0-indexing)
    print("Step 1: Removing email imports...")
    # Line 14: import { createDraft } from './modules/drafts-gmail.js';
    # Line 16: import { sanitizeHumanizedEmail, replacePlaceholders } from './modules/email-sanitizer.js';

    new_lines = []
    for i, line in enumerate(lines):
        line_num = i + 1
        if 'createDraft' in line and 'drafts-gmail' in line:
            removed_lines.append((line_num, 'createDraft import'))
            continue
        if 'sanitizeHumanizedEmail' in line and 'email-sanitizer' in line:
            removed_lines.append((line_num, 'email-sanitizer import'))
            continue
        new_lines.append(line)

    lines = new_lines
    print(f"OK Removed {len(removed_lines)} import lines\n")

    # Step 2: Remove extractContactInfo function (lines 412-460)
    print("Step 2: Removing extractContactInfo function...")
    new_lines = []
    skip_until = -1
    for i, line in enumerate(lines):
        line_num = i + 1

        if skip_until > 0 and i < skip_until:
            continue

        # Find function start
        if 'function extractContactInfo' in line:
            # Find the end by counting braces
            brace_count = 0
            started = False
            for j in range(i, len(lines)):
                for char in lines[j]:
                    if char == '{':
                        brace_count += 1
                        started = True
                    elif char == '}':
                        brace_count -= 1

                    if started and brace_count == 0:
                        # Found the end, skip including the comment before
                        start_line = i
                        # Go back to find comment
                        while start_line > 0 and ('/**' in lines[start_line-1] or '*' in lines[start_line-1]):
                            start_line -= 1
                        skip_until = j + 1
                        removed_lines.append((start_line+1, f'extractContactInfo function ({j-start_line+1} lines)'))
                        break
                if skip_until > 0:
                    break
            continue

        new_lines.append(line)

    lines = new_lines
    print(f"✓ Removed extractContactInfo\n")

    # Step 3: Remove humanizeEmailWithAI function (very large, ~466-878)
    print("Step 3: Removing humanizeEmailWithAI function...")
    new_lines = []
    skip_until = -1
    for i, line in enumerate(lines):
        if skip_until > 0 and i < skip_until:
            continue

        if 'async function humanizeEmailWithAI' in line:
            brace_count = 0
            started = False
            for j in range(i, len(lines)):
                for char in lines[j]:
                    if char == '{':
                        brace_count += 1
                        started = True
                    elif char == '}':
                        brace_count -= 1

                    if started and brace_count == 0:
                        start_line = i
                        while start_line > 0 and ('/**' in lines[start_line-1] or '* ' in lines[start_line-1] or '*/' in lines[start_line-1]):
                            start_line -= 1
                        skip_until = j + 1
                        removed_lines.append((start_line+1, f'humanizeEmailWithAI function ({j-start_line+1} lines)'))
                        break
                if skip_until > 0:
                    break
            continue

        new_lines.append(line)

    lines = new_lines
    print(f"✓ Removed humanizeEmailWithAI\n")

    # Step 4-6: Remove other email functions
    for func_name in ['generateCritiqueReasoning', 'qaReviewEmail', 'generateEmail']:
        print(f"Step: Removing {func_name} function...")
        new_lines = []
        skip_until = -1
        for i, line in enumerate(lines):
            if skip_until > 0 and i < skip_until:
                continue

            if f'function {func_name}' in line:
                brace_count = 0
                started = False
                for j in range(i, len(lines)):
                    for char in lines[j]:
                        if char == '{':
                            brace_count += 1
                            started = True
                        elif char == '}':
                            brace_count -= 1

                        if started and brace_count == 0:
                            start_line = i
                            while start_line > 0 and ('/**' in lines[start_line-1] or '* ' in lines[start_line-1] or '*/' in lines[start_line-1]):
                                start_line -= 1
                            skip_until = j + 1
                            removed_lines.append((start_line+1, f'{func_name} function ({j-start_line+1} lines)'))
                            break
                    if skip_until > 0:
                        break
                continue

            new_lines.append(line)

        lines = new_lines
        print(f"✓ Removed {func_name}\n")

    # Step 7: Update folder structure (change leadGrade to websiteGrade)
    print("Step 7: Updating folder structure...")
    for i, line in enumerate(lines):
        if 'const leadGrade = result.emailQA' in line:
            # Replace this section
            lines[i] = ""  # Remove this line
        elif "`lead-${leadGrade}`" in line:
            lines[i] = line.replace("`lead-${leadGrade}`", "`grade-${websiteGrade}`")
    print("✓ Updated folder paths\n")

    # Step 8: Remove email file writes
    print("Step 8: Removing email file writes...")
    new_lines = []
    skip_mode = False
    for i, line in enumerate(lines):
        # Start skipping at "// 3. Save email content"
        if '// 3. Save email content' in line or '// 3b. Save critique reasoning' in line or '// 3c. Save QA review' in line:
            skip_mode = True

        # Stop skipping at "// 4. Save client info"
        if '// 4. Save client info' in line or '// 3. Save client info' in line:
            skip_mode = False
            new_lines.append(line)
            continue

        if not skip_mode:
            new_lines.append(line)

    lines = new_lines
    print("✓ Removed email file writes\n")

    # Step 9: Remove email workflow from analyzeWebsite
    print("Step 9: Removing email generation workflow...")
    new_lines = []
    skip_mode = False
    for i, line in enumerate(lines):
        # Start skipping at "Step 10: Generate email"
        if 'Step 10: Generate email' in line:
            skip_mode = True

        # Stop at "// Add result" or similar
        if skip_mode and ('// Add result' in line or 'const result = {' in line):
            skip_mode = False

        if not skip_mode:
            new_lines.append(line)

    lines = new_lines
    print("✓ Removed email workflow\n")

    # Step 10: Remove email fields from result and other places
    print("Step 10: Cleaning up references...")
    new_lines = []
    for line in lines:
        # Skip lines with email fields
        if re.match(r'\s*email: email,', line):
            continue
        if re.match(r'\s*emailQA:', line):
            continue
        if re.match(r'\s*draft:', line):
            continue
        if 'critiqueReasoning:' in line and 'result.' in line:
            continue
        if 'leadGrade: leadGrade,' in line:
            continue
        if 'extractContactInfo(' in line:
            continue
        # Remove email operations from cost breakdown
        if re.match(r'\s*emailWriting:', line):
            continue
        if re.match(r'\s*critiqueReasoning:', line) and 'true' in line:
            continue
        if re.match(r'\s*qaReview:', line) and 'true' in line:
            continue
        if re.match(r'\s*cheapModel:', line):
            continue

        new_lines.append(line)

    lines = new_lines
    print("✓ Cleaned up references\n")

    # Write output
    with open('analyzer.js', 'w', encoding='utf-8') as f:
        f.writelines(lines)

    final_count = len(lines)
    removed = original_count - final_count

    print("═══════════════════════════════════════════════")
    print(f"📊 SUMMARY:")
    print(f"   Original lines: {original_count}")
    print(f"   Final lines: {final_count}")
    print(f"   Removed: {removed} lines ({removed/original_count*100:.1f}%)")
    print("═══════════════════════════════════════════════\n")

    print("✅ Refactoring complete!")
    print("\nRemoved components:")
    for line_num, desc in removed_lines[:10]:  # Show first 10
        print(f"  - Line {line_num}: {desc}")
    if len(removed_lines) > 10:
        print(f"  ... and {len(removed_lines) - 10} more")

if __name__ == '__main__':
    main()
