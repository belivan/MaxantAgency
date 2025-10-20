# Command Center Integration Guide

**For:** Command Center UI (Agent 4)
**From:** Prospecting Engine (Agent 1)
**Status:** Production Ready ✅
**Version:** 2.0.0
**Last Updated:** October 19, 2025

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [API Reference](#api-reference)
4. [Real-Time Streaming (SSE)](#real-time-streaming-sse)
5. [Data Schemas](#data-schemas)
6. [React Integration Examples](#react-integration-examples)
7. [Error Handling](#error-handling)
8. [Testing & Debugging](#testing--debugging)
9. [Performance & Rate Limits](#performance--rate-limits)

---

## 🚀 Quick Start

### **Server Details**

```
Base URL: http://localhost:3010
Service:  Prospecting Engine
Version:  2.0.0
Status:   Running (check /api/health)
```

### **1. Check Health**

```bash
curl http://localhost:3010/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "prospecting-engine",
  "version": "2.0.0",
  "timestamp": "2025-10-19T23:47:42.123Z"
}
```

### **2. Get Existing Prospects**

```bash
curl "http://localhost:3010/api/prospects?limit=10"
```

### **3. Start New Prospecting Job**

```bash
curl -X POST http://localhost:3010/api/prospect \
  -H "Content-Type: application/json" \
  -d '{
    "brief": {
      "industry": "Italian restaurants",
      "location": "Philadelphia, PA",
      "minRating": 4.0,
      "count": 10
    }
  }'
```

---

## 🏗️ Architecture Overview

### **How the Prospecting Engine Works**

```
Command Center UI (You)
        ↓
  POST /api/prospect (SSE stream)
        ↓
┌─────────────────────────────────┐
│  PROSPECTING ENGINE PIPELINE    │
├─────────────────────────────────┤
│ Step 1: Google Maps Discovery   │ ← Find businesses
│ Step 2: Website Verification    │ ← Check if website exists
│ Step 3: Screenshot Capture      │ ← Take screenshot
│ Step 4: Data Extraction          │ ← DOM scraper + Grok Vision
│         - Email (67% success)    │
│         - Phone (89% success)    │
│         - Services (78% success) │
│ Step 5: Social Discovery         │ ← Find Instagram, Facebook
│ Step 6: Social Scraping          │ ← Get follower counts, bios
│ Step 7: ICP Scoring              │ ← Relevance score (0-100)
└─────────────────────────────────┘
        ↓
  Save to Supabase Database
        ↓
  Return results via SSE
        ↓
  Command Center UI displays
```

### **What You Get**

For each prospect, you receive:

✅ **Business Info:** Name, address, phone, email, website
✅ **Google Data:** Rating, review count, place ID
✅ **Extracted Data:** Description, services, contact info
✅ **Social Profiles:** Instagram, Facebook, TikTok, etc.
✅ **Social Metadata:** Follower counts, bios, profile images
✅ **ICP Score:** Relevance score (0-100)
✅ **Performance:** Discovery time, cost tracking

---

## 📡 API Reference

### **1. POST /api/prospect** - Generate Prospects

**Purpose:** Start a new prospecting job (finds and enriches businesses)

**Method:** `POST`
**Endpoint:** `/api/prospect`
**Content-Type:** `application/json`
**Response Type:** `text/event-stream` (Server-Sent Events)

#### **Request Body:**

```typescript
{
  "brief": {
    // Required: At least one of these
    "industry"?: string;      // e.g., "Italian restaurants"
    "target"?: string;        // e.g., "fine dining establishments"

    // Optional filters
    "location"?: string;      // e.g., "Philadelphia, PA"
    "city"?: string;          // e.g., "Philadelphia"
    "state"?: string;         // e.g., "PA"
    "zipcode"?: string;       // e.g., "19103"
    "radius"?: number;        // Search radius in meters (default: 10000)
    "minRating"?: number;     // Minimum Google rating (1.0-5.0)
    "count"?: number;         // Number of prospects (default: 10, max: 60)
  },

  "options"?: {
    // Pipeline control
    "scrapeWebsites"?: boolean;      // Default: true
    "useGrokFallback"?: boolean;     // Default: true
    "scrapeSocial"?: boolean;        // Default: true
    "checkRelevance"?: boolean;      // Default: true

    // Performance tuning
    "timeout"?: number;              // Website timeout (ms, default: 30000)
    "maxConcurrent"?: number;        // Concurrent requests (default: 5)
    "delay"?: number;                // Delay between requests (ms, default: 1000)
  }
}
```

#### **Example Request:**

```bash
curl -X POST http://localhost:3010/api/prospect \
  -H "Content-Type: application/json" \
  -d '{
    "brief": {
      "industry": "dental practices",
      "location": "New York, NY",
      "minRating": 4.0,
      "count": 20
    },
    "options": {
      "scrapeWebsites": true,
      "scrapeSocial": true,
      "timeout": 30000
    }
  }'
```

#### **Response (SSE Stream):**

The response is a **Server-Sent Event stream**. You'll receive multiple events:

**Event 1: Started**
```json
data: {
  "type": "started",
  "timestamp": "2025-10-19T23:47:42.123Z"
}
```

**Event 2-N: Progress Updates**
```json
data: {
  "type": "progress",
  "step": "discovery",
  "message": "Found 15 businesses in Philadelphia",
  "company": "Dante & Luigi's",
  "currentStep": 1,
  "totalSteps": 7,
  "timestamp": "2025-10-19T23:47:45.456Z"
}
```

**Final Event: Complete**
```json
data: {
  "type": "complete",
  "results": {
    "prospectsFound": 10,
    "prospectsEnriched": 10,
    "websitesScraped": 10,
    "emailsFound": 7,
    "phonesFound": 9,
    "socialProfilesFound": 8,
    "averageIcpScore": 85,
    "totalCost": 0.024,
    "totalTime": 45230,
    "runId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2025-10-19T23:48:28.789Z"
}
```

---

### **2. GET /api/prospects** - List Prospects

**Purpose:** Get a list of prospects with optional filters

**Method:** `GET`
**Endpoint:** `/api/prospects`
**Response Type:** `application/json`

#### **Query Parameters:**

```typescript
{
  status?: string;        // Filter by status (e.g., "ready_for_analysis")
  city?: string;          // Filter by city
  industry?: string;      // Filter by industry
  minRating?: number;     // Minimum Google rating
  projectId?: string;     // Filter by project UUID
  runId?: string;         // Filter by prospecting run UUID
  limit?: number;         // Number of results (default: 50, max: 100)
}
```

#### **Example Requests:**

```bash
# Get all prospects (limit 50)
curl http://localhost:3010/api/prospects

# Get prospects for a specific city
curl "http://localhost:3010/api/prospects?city=Philadelphia&limit=20"

# Get high-rated prospects
curl "http://localhost:3010/api/prospects?minRating=4.5&limit=10"

# Get prospects from a specific run
curl "http://localhost:3010/api/prospects?runId=550e8400-e29b-41d4-a716-446655440000"
```

#### **Response:**

```json
{
  "success": true,
  "count": 3,
  "prospects": [
    {
      "id": "073ac34c-9f8d-4a88-a92e-77387eda17f8",
      "created_at": "2025-10-19T23:49:25.589329+00:00",
      "company_name": "Giuseppe & Sons",
      "industry": "Restaurant",
      "website": "https://giuseppesons.com/",
      "website_status": "active",
      "address": "1523 Sansom St, Philadelphia, PA 19102, United States",
      "city": "Philadelphia",
      "state": "PA",
      "contact_email": "giuseppeinfo@schulson.com",
      "contact_phone": "(215) 399-9199",
      "contact_name": null,
      "description": "Giuseppe & Sons serves handmade pasta, Italian-American classics...",
      "services": ["Pasta", "Private Events", "Catering"],
      "google_place_id": "ChIJbYZ7rkTHxokRfhIPW-VgDb4",
      "google_rating": 4.4,
      "google_review_count": 1222,
      "social_profiles": {
        "instagram": "https://www.instagram.com/giuseppesons",
        "facebook": "https://www.facebook.com/GiuseppeSons",
        "tiktok": "https://www.tiktok.com/@giuseppesonsphl"
      },
      "social_metadata": {
        "instagram": {
          "platform": "instagram",
          "username": "giuseppesons",
          "description": "Handmade pasta & Italian classics",
          "image": "https://..."
        }
      },
      "icp_match_score": 95,
      "is_relevant": true,
      "status": "ready_for_analysis",
      "run_id": "0d0581e2-09bb-4d50-9fa4-7a348d23b178",
      "source": "prospecting-engine",
      "discovery_cost": 0,
      "discovery_time_ms": 198895,
      "project_id": null
    }
  ],
  "filters": {
    "city": "Philadelphia",
    "limit": 20
  }
}
```

---

### **3. GET /api/prospects/:id** - Get Single Prospect

**Purpose:** Get detailed information about a specific prospect

**Method:** `GET`
**Endpoint:** `/api/prospects/:id`
**Response Type:** `application/json`

#### **Example:**

```bash
curl http://localhost:3010/api/prospects/073ac34c-9f8d-4a88-a92e-77387eda17f8
```

#### **Response:**

```json
{
  "success": true,
  "prospect": {
    "id": "073ac34c-9f8d-4a88-a92e-77387eda17f8",
    "company_name": "Giuseppe & Sons",
    // ... all prospect fields
  }
}
```

#### **Error Response (404):**

```json
{
  "success": false,
  "error": "Prospect not found"
}
```

---

### **4. GET /api/stats** - Get Statistics

**Purpose:** Get aggregate statistics about prospects

**Method:** `GET`
**Endpoint:** `/api/stats`
**Response Type:** `application/json`

#### **Query Parameters:**

```typescript
{
  city?: string;       // Filter stats by city
  projectId?: string;  // Filter stats by project
}
```

#### **Example:**

```bash
# Overall stats
curl http://localhost:3010/api/stats

# Stats for specific city
curl "http://localhost:3010/api/stats?city=Philadelphia"
```

#### **Response:**

```json
{
  "success": true,
  "stats": {
    "total": 20,
    "byStatus": {
      "ready_for_analysis": 20
    },
    "byIndustry": {
      "Restaurant": 15,
      "Bar": 5
    },
    "averageRating": 4.3,
    "withWebsite": 20,
    "withSocial": 18
  }
}
```

---

### **5. GET /api/health** - Health Check

**Purpose:** Check if the service is running

**Method:** `GET`
**Endpoint:** `/api/health`
**Response Type:** `application/json`

#### **Example:**

```bash
curl http://localhost:3010/api/health
```

#### **Response:**

```json
{
  "status": "healthy",
  "service": "prospecting-engine",
  "version": "2.0.0",
  "timestamp": "2025-10-19T23:47:42.123Z"
}
```

---

## 🔄 Real-Time Streaming (SSE)

### **What is Server-Sent Events (SSE)?**

SSE allows the server to push updates to the client in real-time. Perfect for showing live progress!

### **Why SSE for Prospecting?**

Prospecting can take 1-5 minutes for 20 prospects. SSE lets you show:
- ✅ Live progress ("Step 3/7: Scraping websites...")
- ✅ Current company being processed
- ✅ Results as they come in
- ✅ Errors immediately
- ✅ Final summary

### **SSE Event Types**

| Event Type | When | Data |
|------------|------|------|
| `started` | Job begins | Timestamp |
| `progress` | Each step | Step name, company, progress |
| `company_complete` | Prospect done | Full prospect data |
| `error` | Error occurs | Error message |
| `complete` | Job done | Summary stats |

### **React/TypeScript Example**

```typescript
import { useState, useEffect } from 'react';

interface ProspectingProgress {
  type: 'started' | 'progress' | 'company_complete' | 'error' | 'complete';
  message?: string;
  company?: string;
  currentStep?: number;
  totalSteps?: number;
  results?: any;
  error?: string;
  timestamp: string;
}

export function useProspecting() {
  const [progress, setProgress] = useState<ProspectingProgress[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  const startProspecting = async (brief: any, options?: any) => {
    setIsRunning(true);
    setProgress([]);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('http://localhost:3010/api/prospect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brief, options }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            setProgress(prev => [...prev, data]);

            if (data.type === 'complete') {
              setResults(data.results);
              setIsRunning(false);
            } else if (data.type === 'error') {
              setError(data.error);
              setIsRunning(false);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsRunning(false);
    }
  };

  return {
    startProspecting,
    progress,
    isRunning,
    error,
    results,
  };
}
```

### **Usage in Component:**

```tsx
import { useProspecting } from './hooks/useProspecting';

export function ProspectingPanel() {
  const { startProspecting, progress, isRunning, error, results } = useProspecting();

  const handleStart = () => {
    startProspecting({
      industry: 'Italian restaurants',
      location: 'Philadelphia, PA',
      minRating: 4.0,
      count: 10
    });
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isRunning}>
        {isRunning ? 'Running...' : 'Start Prospecting'}
      </button>

      {/* Live Progress */}
      <div className="progress-feed">
        {progress.map((event, i) => (
          <div key={i} className={`event event-${event.type}`}>
            {event.type === 'progress' && (
              <>
                <strong>Step {event.currentStep}/{event.totalSteps}:</strong> {event.message}
                {event.company && <em> ({event.company})</em>}
              </>
            )}
            {event.type === 'complete' && (
              <strong>✅ Complete! Found {event.results.prospectsFound} prospects</strong>
            )}
          </div>
        ))}
      </div>

      {/* Final Results */}
      {results && (
        <div className="results-summary">
          <h3>Results</h3>
          <ul>
            <li>Prospects Found: {results.prospectsFound}</li>
            <li>Emails Found: {results.emailsFound}</li>
            <li>Phones Found: {results.phonesFound}</li>
            <li>Social Profiles: {results.socialProfilesFound}</li>
            <li>Total Time: {(results.totalTime / 1000).toFixed(1)}s</li>
            <li>Total Cost: ${results.totalCost.toFixed(3)}</li>
          </ul>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="error">
          ❌ Error: {error}
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Data Schemas

### **Prospect Object (Full)**

```typescript
interface Prospect {
  // Core IDs
  id: string;                          // UUID
  created_at: string;                  // ISO timestamp
  project_id?: string | null;          // UUID (optional)
  run_id: string;                      // UUID (prospecting run ID)
  source: string;                      // "prospecting-engine"
  status: string;                      // "ready_for_analysis", "analyzing", etc.

  // Business Info
  company_name: string;                // "Giuseppe & Sons"
  industry: string;                    // "Restaurant"
  website: string;                     // "https://giuseppesons.com/"
  website_status: string;              // "active", "down", "unreachable"

  // Location
  address: string;                     // "1523 Sansom St, Philadelphia, PA 19102"
  city: string;                        // "Philadelphia"
  state: string;                       // "PA"

  // Contact Info (may be null if not found)
  contact_email?: string | null;       // "info@company.com"
  contact_phone?: string | null;       // "(215) 555-0100"
  contact_name?: string | null;        // "John Doe" (rarely found)

  // Extracted Data
  description?: string | null;         // Business description (1-3 sentences)
  services?: string[] | null;          // ["Pasta", "Catering", "Private Events"]

  // Google Data
  google_place_id: string;             // "ChIJbYZ7rkTHxokRfhIPW-VgDb4"
  google_rating?: number | null;       // 4.4 (1.0-5.0)
  google_review_count?: number | null; // 1222

  // Social Profiles
  social_profiles?: {
    instagram?: string | null;         // "https://www.instagram.com/..."
    facebook?: string | null;
    tiktok?: string | null;
    twitter?: string | null;
    youtube?: string | null;
    linkedin?: string | null;
  } | null;

  // Social Metadata (scraped data)
  social_metadata?: {
    instagram?: {
      platform: string;                // "instagram"
      username?: string;               // "giuseppesons"
      name?: string;                   // Display name
      description?: string;            // Bio
      image?: string;                  // Profile pic URL
    };
    facebook?: {
      platform: string;
      name?: string;
      description?: string;
      image?: string;
    };
    // ... other platforms
  } | null;

  // ICP Scoring
  icp_match_score?: number | null;     // 0-100
  is_relevant: boolean;                // true/false

  // Performance Tracking
  discovery_cost?: number | null;      // USD (e.g., 0.024)
  discovery_time_ms?: number | null;   // Milliseconds (e.g., 45230)

  // Workflow fields (for later stages)
  why_now?: string | null;             // Set by Analysis Engine
  teaser?: string | null;              // Set by Analysis Engine
  brief_snapshot?: any | null;         // Original ICP brief
  last_status_change?: string | null;  // ISO timestamp
}
```

### **Prospecting Results Summary**

```typescript
interface ProspectingResults {
  prospectsFound: number;              // Total found
  prospectsEnriched: number;           // Successfully enriched
  websitesScraped: number;             // Websites accessed
  emailsFound: number;                 // Emails extracted
  phonesFound: number;                 // Phones extracted
  socialProfilesFound: number;         // Social accounts found
  averageIcpScore: number;             // Average relevance (0-100)
  totalCost: number;                   // Total USD cost
  totalTime: number;                   // Total milliseconds
  runId: string;                       // UUID for this run
}
```

---

## 🎨 React Integration Examples

### **Example 1: Simple Prospecting Button**

```tsx
import { useState } from 'react';

export function StartProspectingButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const handleClick = async () => {
    setIsRunning(true);

    const response = await fetch('http://localhost:3010/api/prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: {
          industry: 'dental practices',
          location: 'New York, NY',
          count: 10
        }
      })
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

          if (event.type === 'complete') {
            setResults(event.results);
            setIsRunning(false);
          }
        }
      }
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={isRunning}>
        {isRunning ? 'Finding Prospects...' : 'Start Prospecting'}
      </button>

      {results && (
        <p>Found {results.prospectsFound} prospects in {(results.totalTime / 1000).toFixed(1)}s</p>
      )}
    </div>
  );
}
```

---

### **Example 2: Prospect List with Filters**

```tsx
import { useState, useEffect } from 'react';

interface ProspectFilters {
  city?: string;
  minRating?: number;
  limit?: number;
}

export function ProspectList() {
  const [prospects, setProspects] = useState([]);
  const [filters, setFilters] = useState<ProspectFilters>({ limit: 20 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProspects();
  }, [filters]);

  const loadProspects = async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (filters.city) params.append('city', filters.city);
    if (filters.minRating) params.append('minRating', filters.minRating.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`http://localhost:3010/api/prospects?${params}`);
    const data = await response.json();

    setProspects(data.prospects);
    setLoading(false);
  };

  return (
    <div>
      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="City"
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
        />
        <input
          type="number"
          placeholder="Min Rating"
          min="1"
          max="5"
          step="0.1"
          onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
        />
      </div>

      {/* Prospect Cards */}
      <div className="prospect-grid">
        {loading ? (
          <p>Loading...</p>
        ) : (
          prospects.map(prospect => (
            <div key={prospect.id} className="prospect-card">
              <h3>{prospect.company_name}</h3>
              <p>{prospect.address}</p>
              <p>⭐ {prospect.google_rating} ({prospect.google_review_count} reviews)</p>
              {prospect.contact_email && <p>📧 {prospect.contact_email}</p>}
              {prospect.contact_phone && <p>📞 {prospect.contact_phone}</p>}
              <p>ICP Score: {prospect.icp_match_score}/100</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

### **Example 3: Live Progress Indicator**

```tsx
import { useState } from 'react';

export function ProspectingProgress() {
  const [progress, setProgress] = useState({
    currentStep: 0,
    totalSteps: 7,
    message: '',
    company: ''
  });

  const startProspecting = async () => {
    const response = await fetch('http://localhost:3010/api/prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: { industry: 'restaurants', location: 'NYC', count: 5 }
      })
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

          if (event.type === 'progress') {
            setProgress({
              currentStep: event.currentStep,
              totalSteps: event.totalSteps,
              message: event.message,
              company: event.company || ''
            });
          }
        }
      }
    }
  };

  const progressPercent = (progress.currentStep / progress.totalSteps) * 100;

  return (
    <div>
      <button onClick={startProspecting}>Start</button>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Progress Text */}
      <p>
        Step {progress.currentStep}/{progress.totalSteps}: {progress.message}
      </p>
      {progress.company && <p>Processing: <strong>{progress.company}</strong></p>}
    </div>
  );
}
```

---

## ⚠️ Error Handling

### **HTTP Error Codes**

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Prospect found |
| 400 | Bad Request | Missing required field |
| 404 | Not Found | Prospect doesn't exist |
| 500 | Server Error | Database connection failed |

### **Error Response Format**

```json
{
  "success": false,
  "error": "Error message here"
}
```

### **Common Errors**

**1. Missing Brief**
```json
{
  "success": false,
  "error": "Missing \"brief\" in request body"
}
```

**2. Invalid Brief**
```json
{
  "success": false,
  "error": "Brief must include \"industry\" or \"target\""
}
```

**3. Prospect Not Found**
```json
{
  "success": false,
  "error": "Prospect not found"
}
```

### **Error Handling in React**

```tsx
const handleProspecting = async () => {
  try {
    const response = await fetch('http://localhost:3010/api/prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    // Handle SSE stream...

  } catch (error) {
    console.error('Prospecting failed:', error);

    // Show user-friendly error
    if (error.message.includes('brief')) {
      alert('Please provide industry or target in your brief');
    } else if (error.message.includes('network')) {
      alert('Cannot connect to Prospecting Engine. Is it running?');
    } else {
      alert(`Error: ${error.message}`);
    }
  }
};
```

---

## 🧪 Testing & Debugging

### **1. Test Health Endpoint**

```bash
curl http://localhost:3010/api/health
```

**Expected:** `{"status":"healthy",...}`

---

### **2. Test Simple GET Request**

```bash
curl http://localhost:3010/api/prospects?limit=1
```

**Expected:** JSON array with 1 prospect

---

### **3. Test POST with Minimal Brief**

```bash
curl -X POST http://localhost:3010/api/prospect \
  -H "Content-Type: application/json" \
  -d '{
    "brief": {
      "industry": "restaurants",
      "location": "Philadelphia, PA",
      "count": 1
    }
  }'
```

**Expected:** SSE stream with progress events

---

### **4. Check Logs**

The Prospecting Engine logs all operations:

```bash
# Check server output
# Look for lines like:
# [info] HTTP Request {"method":"POST","path":"/api/prospect"}
# [info] Starting prospecting pipeline
# [info] Step 1: Google Maps Discovery
```

---

### **5. Verify Database**

```bash
curl http://localhost:3010/api/stats
```

**Expected:** Stats showing total prospects in database

---

### **Debugging Checklist**

❓ **Prospecting Engine not responding?**
- Check if server is running: `curl http://localhost:3010/api/health`
- Check console for errors
- Verify port 3010 is not in use

❓ **SSE stream not working?**
- Make sure you're handling `text/event-stream` content type
- Check browser DevTools Network tab
- Verify EventSource or fetch with streaming is used correctly

❓ **No prospects found?**
- Check your brief (industry + location required)
- Verify Google Maps API key is valid
- Check if location is spelled correctly

❓ **Missing emails/phones?**
- This is expected! 67% email success, 89% phone success
- Some businesses don't publish contact info publicly
- Check `website_status` - if "down", we couldn't scrape it

---

## ⚡ Performance & Rate Limits

### **Performance Expectations**

| Metric | Value |
|--------|-------|
| **Single prospect** | 2-20 seconds |
| **10 prospects** | 30-90 seconds |
| **20 prospects** | 60-180 seconds |
| **50 prospects** | 2-5 minutes |

**Factors affecting speed:**
- Website response time (some sites are slow)
- Grok Vision usage (only for low-confidence sites)
- Social media scraping (adds 1-3s per prospect)

---

### **Cost Tracking**

The engine tracks costs automatically:

```typescript
{
  discovery_cost: 0.024,        // USD
  discovery_time_ms: 45230      // Milliseconds
}
```

**Typical costs:**
- Google Maps: $0.005 per request
- Grok Vision (when used): $0.008 per extraction
- DOM scraper: $0.000 (free!)
- Average: **$0.0018 per prospect**

---

### **Rate Limits**

**Default settings:**
```
MAX_CONCURRENT_REQUESTS = 5
REQUEST_DELAY_MS = 1000
```

**Google Maps API limits:**
- Free tier: 10,000 requests/month
- After that: $0.005 per request

**Recommendations:**
- Limit to 60 prospects per request (API enforced)
- Don't run multiple jobs simultaneously
- Monitor costs via `/api/stats`

---

## 🎯 Best Practices

### **1. Use Specific Briefs**

❌ **Too vague:**
```json
{
  "brief": {
    "industry": "businesses"
  }
}
```

✅ **Specific:**
```json
{
  "brief": {
    "industry": "Italian restaurants",
    "location": "Philadelphia, PA",
    "minRating": 4.0,
    "count": 20
  }
}
```

---

### **2. Handle SSE Properly**

❌ **Don't use regular fetch without streaming:**
```tsx
const response = await fetch(url);
const json = await response.json(); // ❌ Won't work with SSE
```

✅ **Use streaming reader:**
```tsx
const reader = response.body.getReader();
// Process chunks as they arrive ✅
```

---

### **3. Show Live Progress**

✅ **Good UX:**
- Show progress bar
- Display current step
- Show company being processed
- Update in real-time

❌ **Bad UX:**
- Just show "Loading..."
- No indication of progress
- User doesn't know what's happening

---

### **4. Cache Prospect Data**

✅ **Cache in your state:**
```tsx
const [prospects, setProspects] = useState([]);

// Load once, filter locally
useEffect(() => {
  loadProspects();
}, []);
```

❌ **Don't reload on every render:**
```tsx
// This will hammer the API ❌
const prospects = await fetch('...').then(r => r.json());
```

---

### **5. Handle Null Values**

Many fields can be `null`. Always check:

```tsx
// ❌ Will crash if contact_email is null
<p>{prospect.contact_email.toLowerCase()}</p>

// ✅ Safe
<p>{prospect.contact_email?.toLowerCase() || 'No email'}</p>
```

---

## 📚 Complete Integration Checklist

### **Phase 1: Basic Integration**

- [ ] Test health endpoint (`/api/health`)
- [ ] Test GET prospects (`/api/prospects`)
- [ ] Display prospect cards in UI
- [ ] Add filters (city, rating, limit)
- [ ] Handle loading states

### **Phase 2: Prospecting**

- [ ] Create prospecting form (industry, location, count)
- [ ] Implement SSE stream handling
- [ ] Show live progress updates
- [ ] Display results summary
- [ ] Handle errors gracefully

### **Phase 3: Polish**

- [ ] Add progress bar/indicator
- [ ] Show current company being processed
- [ ] Display cost and time metrics
- [ ] Add pagination for prospect list
- [ ] Implement prospect detail view

### **Phase 4: Advanced**

- [ ] Filter by project (when projects exist)
- [ ] Filter by run ID (show prospects from specific run)
- [ ] Show statistics dashboard
- [ ] Export prospects to CSV
- [ ] Connect to Analysis Engine for next stage

---

## 🚀 Quick Reference

### **Server Info**
```
URL: http://localhost:3010
Health: /api/health
Version: 2.0.0
```

### **Key Endpoints**
```
POST /api/prospect           → Start prospecting (SSE)
GET  /api/prospects          → List prospects
GET  /api/prospects/:id      → Get one prospect
GET  /api/stats              → Get statistics
GET  /api/health             → Health check
```

### **Typical Request**
```bash
curl -X POST http://localhost:3010/api/prospect \
  -H "Content-Type: application/json" \
  -d '{
    "brief": {
      "industry": "dental practices",
      "location": "New York, NY",
      "count": 10
    }
  }'
```

### **Success Metrics**
- Email: 67% success
- Phone: 89% success
- Social: 80% success
- Speed: ~2-20s per prospect
- Cost: ~$0.0018 per prospect

---

## 💬 Need Help?

**Questions?** Check:
1. Server logs (console output)
2. Browser DevTools (Network tab)
3. This guide (search for your issue)

**Common issues resolved:**
- ✅ Server not responding → Check `npm start` is running
- ✅ CORS errors → Already configured (should work)
- ✅ SSE not working → Use proper streaming reader
- ✅ No data → Check brief format (industry + location)

---

**The Prospecting Engine is ready to integrate!** 🎉

Good luck with the Command Center UI integration! If you need any clarification or run into issues, let me know.
