# Client Landing Page

A beautiful, client-facing landing page for MaxantAgency's website analysis reports.

## Features

- 🎨 Modern UI with dark/light mode support
- 🔍 Report lookup by company name
- ⏳ Premium loading animation sequence
- 📊 Interactive report display with grades and scores
- 📅 Calendly integration for scheduling
- 📧 Contact form for inquiries
- 📱 Fully responsive design

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3004](http://localhost:3004) to view the landing page.

### 3. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
client-landing-page/
├── app/
│   ├── page.tsx              # Main landing page
│   ├── layout.tsx            # Root layout with theme
│   └── globals.css           # Global styles
├── components/
│   ├── hero-section.tsx      # Hero with headline
│   ├── report-lookup-form.tsx # Search form
│   ├── loading-sequence.tsx  # Premium loading animation
│   ├── report-viewer.tsx     # Report display
│   ├── cta-section.tsx       # Calendly + Contact form
│   ├── theme-toggle.tsx      # Dark/light mode toggle
│   └── ui/                   # Base UI components
├── lib/
│   ├── mock-data.ts          # Sample report data (Phase 1)
│   └── utils.ts              # Utility functions
└── README.md
```

## Current Status: Phase 1 (Frontend Only)

This is the **frontend mockup** with hardcoded data. Features:

✅ Beautiful UI matching command-center-ui design
✅ All components functional with mock data
✅ Interactive elements (forms, buttons, animations)
✅ Premium multi-step loading animation
✅ Dark/light mode toggle
❌ No backend connections yet (Phase 2)

### Mock Data

The landing page includes 3 sample reports you can search for:

- "Bella Vista Restaurant" (Grade C)
- "Sunshine Plumbing" (Grade D)
- "Elite Fitness" (Grade B)

## Phase 2: Backend Integration (Coming Next)

The next phase will add:

- Real Supabase database connection
- Actual report fetching from storage
- Contact form saving to database
- Live Calendly integration
- API routes for all operations

## Customization

### Update Company Name

Edit `app/layout.tsx` to change the company name in metadata.

### Update Theme Colors

Edit `app/globals.css` CSS variables to customize colors.

### Add Your Calendly Link

When backend is ready, add to `.env.local`:

```env
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/your-link
```

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **UI Components**: Radix UI
- **Theme**: next-themes

## Port Configuration

The app runs on **port 3004** by default to avoid conflicts with other MaxantAgency services.

To change the port, edit `package.json`:

```json
"dev": "next dev -p YOUR_PORT"
```
