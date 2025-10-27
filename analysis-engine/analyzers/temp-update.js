import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('unified-visual-analyzer.js', 'utf8');

const oldCode = `      // Call centralized AI client with both desktop and mobile screenshots
      const response = await callAI({
        model: prompt.model,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt + '\n\n**Screenshot 1: DESKTOP viewport | Screenshot 2: MOBILE viewport**',
        temperature: prompt.temperature,
        images: [page.screenshots.desktop, page.screenshots.mobile],
        jsonMode: true
      });`;

const newCode = `      // Prepare images with smart split support
      // Import compression function to handle sections
      const { compressImageIfNeeded } = await import('../shared/ai-client.js');

      const desktopProcessed = await compressImageIfNeeded(page.screenshots.desktop);
      const mobileProcessed = await compressImageIfNeeded(page.screenshots.mobile);

      // Build images array and description
      const images = [];
      const imageDescriptions = [];
      let imageCounter = 1;

      // Handle desktop (single image or sections)
      if (Array.isArray(desktopProcessed)) {
        desktopProcessed.forEach((section) => {
          images.push(section.buffer);
          imageDescriptions.push(\`Screenshot \${imageCounter}: DESKTOP - \${section.label} SECTION\`);
          imageCounter++;
        });
      } else {
        images.push(desktopProcessed);
        imageDescriptions.push(\`Screenshot \${imageCounter}: DESKTOP viewport\`);
        imageCounter++;
      }

      // Handle mobile (single image or sections)
      if (Array.isArray(mobileProcessed)) {
        mobileProcessed.forEach((section) => {
          images.push(section.buffer);
          imageDescriptions.push(\`Screenshot \${imageCounter}: MOBILE - \${section.label} SECTION\`);
          imageCounter++;
        });
      } else {
        images.push(mobileProcessed);
        imageDescriptions.push(\`Screenshot \${imageCounter}: MOBILE viewport\`);
        imageCounter++;
      }

      const imageContext = '\n\n**' + imageDescriptions.join(' | ') + '**';

      // Call centralized AI client with processed images
      const response = await callAI({
        model: prompt.model,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt + imageContext,
        temperature: prompt.temperature,
        images: images,
        jsonMode: true
      });`;

const updated = content.replace(oldCode, newCode);

if (updated === content) {
  console.log('ERROR: Pattern not found!');
  process.exit(1);
}

writeFileSync('unified-visual-analyzer.js', updated, 'utf8');
console.log('✅ Updated unified-visual-analyzer.js');
