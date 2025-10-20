# Quick Start: Command Center ↔ Prospecting Engine

**5-Minute Integration Guide**

---

## 🚀 Is the Prospecting Engine Running?

```bash
curl http://localhost:3010/api/health
```

✅ If you get `{"status":"healthy"}` → You're good to go!
❌ If connection refused → Run `npm start` in prospecting-engine folder

---

## 📡 The Two Things You Need

### **1. Get Existing Prospects (Simple GET)**

```typescript
const response = await fetch('http://localhost:3010/api/prospects?limit=20');
const data = await response.json();

console.log(data.prospects); // Array of prospects
```

### **2. Generate New Prospects (SSE Stream)**

```typescript
const response = await fetch('http://localhost:3010/api/prospect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    brief: {
      industry: 'Italian restaurants',
      location: 'Philadelphia, PA',
      count: 10
    }
  })
});

// Read SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      console.log(event); // Progress update!

      if (event.type === 'complete') {
        console.log('Done!', event.results);
      }
    }
  }
}
```

---

## 🎨 React Hook (Copy-Paste Ready)

```typescript
import { useState } from 'react';

export function useProspecting() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState([]);
  const [results, setResults] = useState(null);

  const start = async (brief: any) => {
    setIsRunning(true);
    setProgress([]);

    const response = await fetch('http://localhost:3010/api/prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const event = JSON.parse(line.slice(6));
          setProgress(prev => [...prev, event]);

          if (event.type === 'complete') {
            setResults(event.results);
            setIsRunning(false);
          }
        }
      }
    }
  };

  return { start, isRunning, progress, results };
}
```

**Usage:**
```tsx
const { start, isRunning, results } = useProspecting();

<button onClick={() => start({ industry: 'restaurants', location: 'NYC', count: 10 })}>
  {isRunning ? 'Running...' : 'Start'}
</button>

{results && <p>Found {results.prospectsFound} prospects!</p>}
```

---

## 📊 What You Get (Prospect Object)

```typescript
{
  id: "uuid",
  company_name: "Giuseppe & Sons",
  industry: "Restaurant",
  website: "https://giuseppesons.com/",

  // Location
  address: "1523 Sansom St, Philadelphia, PA 19102",
  city: "Philadelphia",
  state: "PA",

  // Contact (may be null!)
  contact_email: "info@company.com",      // 67% success
  contact_phone: "(215) 555-0100",        // 89% success

  // Business data
  description: "Italian restaurant...",
  services: ["Pasta", "Catering"],

  // Google
  google_rating: 4.4,
  google_review_count: 1222,

  // Social
  social_profiles: {
    instagram: "https://...",
    facebook: "https://..."
  },

  // ICP
  icp_match_score: 95,  // 0-100
  is_relevant: true,

  // Status
  status: "ready_for_analysis"
}
```

---

## ⚡ Performance Expectations

| Prospects | Time | Cost |
|-----------|------|------|
| 1 | 2-10s | $0.002 |
| 10 | 30-90s | $0.018 |
| 20 | 1-3min | $0.036 |

**Success Rates:**
- Emails: 67%
- Phones: 89%
- Social: 80%

---

## 🎯 Minimal Working Example

```tsx
import { useState } from 'react';

export function ProspectingDemo() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadProspects = async () => {
    setLoading(true);
    const res = await fetch('http://localhost:3010/api/prospects?limit=10');
    const data = await res.json();
    setProspects(data.prospects);
    setLoading(false);
  };

  return (
    <div>
      <button onClick={loadProspects}>Load Prospects</button>

      {loading && <p>Loading...</p>}

      {prospects.map(p => (
        <div key={p.id}>
          <h3>{p.company_name}</h3>
          <p>{p.contact_email || 'No email'}</p>
          <p>⭐ {p.google_rating}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔧 Troubleshooting

**Connection refused?**
```bash
cd prospecting-engine
npm start
```

**CORS error?**
→ Already configured, should work

**No prospects returned?**
→ Check brief format (needs `industry` + `location`)

**SSE not working?**
→ Use `response.body.getReader()`, not `response.json()`

---

## 📚 Full Documentation

See **COMMAND-CENTER-INTEGRATION.md** for:
- Complete API reference
- All endpoints
- Error handling
- Advanced examples
- TypeScript types
- Best practices

---

**That's it! You're ready to integrate.** 🎉

**Test it:**
1. `curl http://localhost:3010/api/health` (should work)
2. `curl http://localhost:3010/api/prospects?limit=1` (should return data)
3. Use the React hook above in your component

**Questions?** Check the full integration guide!
