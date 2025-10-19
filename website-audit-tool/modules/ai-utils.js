// Shared AI utilities
// Includes a tolerant JSON parser to extract and repair JSON returned by LLMs

export function parseJSONFromText(text) {
  if (!text || typeof text !== 'string') return null;

  // 1) Extract the first JSON-looking block
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let candidate = jsonMatch ? jsonMatch[0] : text.trim();

  const tryParse = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  };

  // Try raw candidate
  let parsed = tryParse(candidate);
  if (parsed) return parsed;

  // Common repairs: remove trailing commas before } or ]
  let repaired = candidate.replace(/,\s*(}|])/g, '$1');
  parsed = tryParse(repaired);
  if (parsed) return parsed;

  // Replace single quotes with double quotes (risky but often helps simple outputs)
  try {
    repaired = repaired.replace(/\'(?:(?:\\')|[^'])*\'/g, (m) => m.replace(/"/g, '\\"'));
    repaired = repaired.replace(/\'/g, '"');
    parsed = tryParse(repaired);
    if (parsed) return parsed;
  } catch (e) {
    // ignore
  }

  // Remove non-JSON-safe characters (control chars) and retry
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, '');
  parsed = tryParse(repaired);
  if (parsed) return parsed;

  // As a last-ditch, attempt to find the largest balanced {...} substring
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sub = text.slice(firstBrace, lastBrace + 1);
    parsed = tryParse(sub);
    if (parsed) return parsed;
    // try removing trailing commas in sub
    const subRepaired = sub.replace(/,\s*(}|])/g, '$1').replace(/[\x00-\x1F\x7F]/g, '');
    parsed = tryParse(subRepaired);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Heuristic partial extractor: when full JSON parsing fails, attempt to extract
 * useful fields (critiques array, humanSummary, humanBullets) from plain text.
 * This is intentionally conservative and returns null if nothing plausible is found.
 */
export function extractPartialResult(text) {
  if (!text || typeof text !== 'string') return null;

  // Heuristic: find numbered lists like '1. ...' - collect first 3 as critiques
  const critiqueLines = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length && critiqueLines.length < 5; i++) {
    const m = lines[i].trim().match(/^\d+\.\s+(.*)$/);
    if (m) critiqueLines.push(m[1].trim());
  }

  // If we found at least one numbered critique, use them
  const critiques = critiqueLines.length > 0 ? critiqueLines.slice(0, 5) : null;

  // Heuristic: first paragraph (text up to first blank line) as humanSummary
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const humanSummary = paragraphs.length > 0 ? paragraphs[0].slice(0, 800) : null;

  // Heuristic: find bullets starting with '-' or '*' as humanBullets
  const bullets = [];
  for (const line of lines) {
    const b = line.trim().match(/^[-*]\s+(.*)$/);
    if (b) bullets.push(b[1].trim());
    if (bullets.length >= 3) break;
  }
  const humanBullets = bullets.length > 0 ? bullets.slice(0, 3) : null;

  if (!critiques && !humanSummary && !humanBullets) return null;

  return {
    companyName: null,
    critiques: critiques || [],
    humanSummary: humanSummary || null,
    humanBullets: humanBullets || null,
    humanizedEmail: null,
    summary: humanSummary || ''
  };
}
