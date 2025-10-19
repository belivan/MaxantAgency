export function buildProspectPrompt({ studio, icp, geo, count = 20, cityHint }) {
  const intro = studio?.intro || "We build conversion-first sites for SMBs.";
  const offer = studio?.offer || "Quick-Wins or Starter Site";
  const price = typeof studio?.price === 'string' ? studio.price : JSON.stringify(studio?.price || {});
  const strengths = (studio?.strengths || []).join(", ");
  const niches = (icp?.niches || []).join(", ");
  const triggers = (icp?.triggers || []).join(", ");
  const exclusions = (icp?.exclusions || []).join(", ");
  const links = (studio?.links || []).join("\n");
  const city = cityHint || geo?.city || "";

  return `You are a prospecting assistant following this workflow:
1) Define ICP narrowly
2) Propose industries and real local companies with a one-line "why now"
3) Output results as strict JSON only, no prose.

Studio intro: ${intro}
Offer: ${offer}
Price: ${price}
Strengths: ${strengths}
Reference links:\n${links}

ICP focus:
- Niches: ${niches}
- Triggers: ${triggers}
- Exclusions: ${exclusions}
- Geo: ${city || 'none'}

Task: Return ${count} companies across 5-8 relevant industries${city ? ` in ${city}` : ''}. For each company include fields:
- industry (string)
- name (string)
- website (string, if known; else empty)
- why_now (one line, specific to triggers)
- teaser (one-sentence opener tailored to the why_now)

Respond ONLY with JSON of shape:
{
  "industries": ["string"...],
  "companies": [
    {"industry":"...","name":"...","website":"","why_now":"...","teaser":"..."}
  ]
}
`;
}

export function buildDomainInferencePrompt(companies) {
  const names = companies.map(c => ({ name: c.name, website: c.website || "" }));
  return `Given company names, infer most likely official website domains. Return JSON only.
Input: ${JSON.stringify(names)}
Output format: [{"name":"...","website":"https://..."}]`;
}

