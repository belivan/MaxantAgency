import fs from 'fs';
import path from 'path';

// Function to recursively find and update JSON files
function updateJSONFiles(dir) {
    const files = fs.readdirSync(dir);
    let updatedCount = 0;

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            updatedCount += updateJSONFiles(filePath);
        } else if (file.endsWith('.json')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let updated = false;

            // Update model names to correct Anthropic API format
            if (content.includes('"claude-4-5-haiku"')) {
                content = content.replace(/"claude-4-5-haiku"/g, '"claude-haiku-4-5"');
                updated = true;
            }
            if (content.includes('"claude-4-5-sonnet"')) {
                content = content.replace(/"claude-4-5-sonnet"/g, '"claude-sonnet-4-5"');
                updated = true;
            }
            if (content.includes('"claude-3-5-haiku-20241022"')) {
                content = content.replace(/"claude-3-5-haiku-20241022"/g, '"claude-haiku-4-5"');
                updated = true;
            }
            if (content.includes('"claude-3-5-sonnet')) {
                content = content.replace(/"claude-3-5-sonnet[^"]*"/g, '"claude-sonnet-4-5"');
                updated = true;
            }
            if (content.includes('"grok-beta"')) {
                content = content.replace(/"grok-beta"/g, '"grok-4"');
                updated = true;
            }

            if (updated) {
                fs.writeFileSync(filePath, content);
                console.log(`Updated: ${filePath}`);
                updatedCount++;
            }
        }
    });

    return updatedCount;
}

// Update Outreach Engine
const outreachPath = 'C:\\Users\\anton\\Desktop\\MaxantAgency\\outreach-engine\\config\\prompts';
console.log('Updating Outreach Engine prompt files...');
let count = updateJSONFiles(outreachPath);
console.log(`Updated ${count} files in Outreach Engine`);

// Update Prospecting Engine
const prospectingPath = 'C:\\Users\\anton\\Desktop\\MaxantAgency\\prospecting-engine\\config\\prompts';
console.log('\nUpdating Prospecting Engine prompt files...');
count = updateJSONFiles(prospectingPath);
console.log(`Updated ${count} files in Prospecting Engine`);

// Update Analysis Engine
const analysisPath = 'C:\\Users\\anton\\Desktop\\MaxantAgency\\analysis-engine\\config\\prompts';
console.log('\nUpdating Analysis Engine prompt files...');
count = updateJSONFiles(analysisPath);
console.log(`Updated ${count} files in Analysis Engine`);

console.log('\nAll model references updated successfully!');