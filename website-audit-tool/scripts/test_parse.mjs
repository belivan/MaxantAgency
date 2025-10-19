import { parseJSONFromText, extractPartialResult } from '../modules/ai-utils.js';

const sample = '{"companyName":"Maksant","critiques":["Page load time of 5740ms is nearly 3x the recommended 2-second threshold, significantly hurting both user experience and SEO rankings. For a web design agency promising \'fast, clean websites\', this slow performance undermines credibility before visitors even read the content. Compress images (6 detected), minify CSS/JS, enable browser caching, and consider a CDN.", "The page title is bloated and repetitive: \'Philadelphia Web Design — Fixed-Price Websites in 5–31 Days | Maksant — Maksant\' ends with the brand name twice, wasting valuable SEO real estate and looking unprofessional. Trim to something like \'Philadelphia Web Design — Fixed-Price Websites in 5–31 Days | Maksant\' to improve click-through rates and search engine effect"]}';

console.log('---- RAW SAMPLE ----');
console.log(sample);

console.log('\n---- parseJSONFromText output ----');
const parsed = parseJSONFromText(sample);
console.log(parsed);

console.log('\n---- extractPartialResult output ----');
const partial = extractPartialResult(sample);
console.log(partial);
