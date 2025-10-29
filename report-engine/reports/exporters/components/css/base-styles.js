/**
 * Base CSS Styles for HTML Reports
 * Generates complete CSS for professional, responsive reports
 */

export function generateCSS() {
  return `<style>
        /* ===============================================
           PROFESSIONAL LIGHT THEME DESIGN SYSTEM
           Mobile-first, Accessible, Print-optimized
           =============================================== */

        /* CSS Reset & Base */
        *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            /* Professional Light Color Palette */
            --primary: #4F46E5;           /* Indigo */
            --primary-light: #818CF8;
            --primary-lighter: #C7D2FE;
            --primary-lightest: #E0E7FF;
            --primary-dark: #3730A3;

            --secondary: #0891B2;          /* Cyan */
            --secondary-light: #22D3EE;
            --secondary-lighter: #A5F3FC;
            --secondary-lightest: #E0F2FE;

            --success: #059669;            /* Green */
            --success-light: #10B981;
            --success-lighter: #6EE7B7;
            --success-lightest: #D1FAE5;

            --warning: #D97706;            /* Amber */
            --warning-light: #F59E0B;
            --warning-lighter: #FCD34D;
            --warning-lightest: #FEF3C7;

            --danger: #DC2626;             /* Red */
            --danger-light: #EF4444;
            --danger-lighter: #FCA5A5;
            --danger-lightest: #FEE2E2;

            /* Neutral Colors */
            --gray-50: #FAFAFA;
            --gray-100: #F4F4F5;
            --gray-200: #E4E4E7;
            --gray-300: #D4D4D8;
            --gray-400: #A1A1AA;
            --gray-500: #71717A;
            --gray-600: #52525B;
            --gray-700: #3F3F46;
            --gray-800: #27272A;
            --gray-900: #18181B;

            /* Background Colors - Lighter & More Minimal */
            --bg-primary: #FFFFFF;
            --bg-secondary: #F9FAFB;        /* Ultra-subtle light gray for cards */
            --bg-tertiary: #FAFAFA;          /* Changed from #F4F4F5 to lighter gray */
            --bg-accent: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);

            /* Text Colors */
            --text-primary: #18181B;
            --text-secondary: #52525B;
            --text-tertiary: #71717A;
            --text-inverse: #FFFFFF;

            /* Border Colors */
            --border-light: #E4E4E7;
            --border-default: #D4D4D8;
            --border-dark: #A1A1AA;

            /* Shadows - Ultra subtle for Notion style */
            --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
            --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
            --shadow-xl: 0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.06);

            /* Spacing Scale */
            --space-1: 0.25rem;
            --space-2: 0.5rem;
            --space-3: 0.75rem;
            --space-4: 1rem;
            --space-5: 1.25rem;
            --space-6: 1.5rem;
            --space-8: 2rem;
            --space-10: 2.5rem;
            --space-12: 3rem;
            --space-16: 4rem;
            --space-20: 5rem;

            /* Typography Scale */
            --text-xs: 0.75rem;
            --text-sm: 0.875rem;
            --text-base: 1rem;
            --text-lg: 1.125rem;
            --text-xl: 1.25rem;
            --text-2xl: 1.5rem;
            --text-3xl: 1.875rem;
            --text-4xl: 2.25rem;
            --text-5xl: 3rem;

            /* Border Radius - Slightly more rounded for Notion style */
            --radius-sm: 0.375rem;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
            --radius-2xl: 1.25rem;
            --radius-full: 9999px;

            /* Transitions */
            --transition-fast: 150ms ease;
            --transition-base: 250ms ease;
            --transition-slow: 350ms ease;
        }

        /* Dark Mode Variables */
        body.dark-mode {
            --primary: #818CF8;
            --primary-light: #A5B4FC;
            --primary-lighter: #C7D2FE;
            --primary-lightest: #312E81;
            --primary-dark: #6366F1;

            --success: #10B981;
            --success-lightest: #064E3B;

            --warning: #F59E0B;
            --warning-light: #FBBF24;
            --warning-lighter: #FCD34D;
            --warning-lightest: #451A03;

            --danger: #EF4444;
            --danger-lightest: #450A0A;

            --bg-primary: #18181B;
            --bg-secondary: #27272A;
            --bg-tertiary: #3F3F46;

            --text-primary: #F4F4F5;
            --text-secondary: #D4D4D8;
            --text-tertiary: #A1A1AA;
            --text-inverse: #18181B;

            --border-light: #3F3F46;
            --border-default: #52525B;
            --border-dark: #71717A;

            --gray-50: #18181B;
            --gray-100: #27272A;
            --gray-200: #3F3F46;
            --gray-300: #52525B;
            --gray-400: #71717A;
            --gray-500: #A1A1AA;
            --gray-600: #D4D4D8;
            --gray-700: #E4E4E7;
            --gray-800: #F4F4F5;
            --gray-900: #FAFAFA;

            --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
            --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4);
            --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.6);
            --shadow-lg: 0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -2px rgba(0, 0, 0, 0.6);
            --shadow-xl: 0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -4px rgba(0, 0, 0, 0.7);

            background-color: #18181B;
        }

        /* Base Typography */
        html {
            font-size: 16px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            font-size: var(--text-base);
            font-weight: 400;             /* Lighter font weight */
            line-height: 1.7;              /* More line height for breathing room */
            letter-spacing: 0.01em;        /* Wider letter spacing like Notion */
            color: var(--text-primary);
            background-color: #FFFFFF;     /* Pure white background */
            min-height: 100vh;
        }

        /* Container System */
        .report-wrapper {
            background: var(--bg-secondary);
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--space-4);
        }

        @media (min-width: 768px) {
            .container {
                padding: 0 var(--space-8);
            }
        }

        /* ===============================================
           HERO SECTION - Executive Dashboard
           =============================================== */

        .hero-section {
            background: var(--bg-primary);          /* Adapts to light/dark mode */
            color: var(--text-primary);             /* Dark text in light mode, light in dark */
            padding: var(--space-12) 0;
            position: relative;
            overflow: hidden;
            border-bottom: 1px solid var(--border-light);  /* Subtle border */
        }

        .hero-section::before {
            /* Remove heavy pattern background */
            display: none;
        }

        .hero-content {
            position: relative;
            z-index: 1;
        }

        .hero-header {
            text-align: center;
            margin-bottom: var(--space-12);
        }

        .company-name {
            font-size: clamp(var(--text-2xl), 4vw, var(--text-4xl));  /* Smaller */
            font-weight: 600;                /* Much lighter (was 800) */
            margin-bottom: var(--space-2);
            letter-spacing: -0.01em;         /* Less tight */
            color: var(--text-primary);
        }

        .company-meta {
            font-size: var(--text-base);     /* Smaller (was text-lg) */
            opacity: 0.6;                     /* Lighter (was 0.9) */
            font-weight: 400;
            color: var(--text-secondary);
        }

        /* Score Display Card */
        .score-card {
            background: var(--bg-secondary);          /* Subtle gray background */
            border: 1px solid var(--border-light);    /* Light border */
            border-radius: var(--radius-2xl);
            padding: var(--space-10);
            margin-bottom: var(--space-8);
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);  /* Subtle shadow */
        }

        .score-display-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: var(--space-12);
            flex-wrap: wrap;
        }

        .score-circle {
            width: 140px;                                    /* Slightly smaller */
            height: 140px;
            border-radius: var(--radius-full);
            background: var(--bg-primary);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--border-light);          /* Subtle border instead of heavy gradient */
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);      /* Very subtle shadow */
            position: relative;
        }

        .score-circle::before {
            /* Remove heavy gradient border */
            display: none;
        }

        .grade-letter {
            font-size: var(--text-4xl);                     /* Smaller */
            font-weight: 700;                                /* Lighter (was 800) */
            color: var(--text-primary);                      /* Solid dark color instead of gradient */
            line-height: 1;
        }

        .score-value {
            font-size: var(--text-xl);
            color: var(--text-secondary);
            font-weight: 600;
            margin-top: var(--space-2);
        }

        .score-details {
            flex: 1;
            min-width: 300px;
            text-align: left;
        }

        .score-breakdown {
            display: grid;
            gap: var(--space-4);
        }

        .metric-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-3) 0;
            border-bottom: 1px solid var(--border-light);    /* Dark border for white bg */
        }

        .metric-label {
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }

        .metric-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .metric-score {
            font-weight: 700;
            font-size: var(--text-lg);
        }

        /* Key Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--space-6);
            margin-top: var(--space-8);
        }

        .metric-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-xl);
            padding: var(--space-6);
            transition: transform var(--transition-base), box-shadow var(--transition-base);
        }

        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .metric-card-header {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            margin-bottom: var(--space-3);
        }

        .metric-card-icon {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--text-xl);
        }

        .metric-card-title {
            font-size: var(--text-sm);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            opacity: 0.9;
        }

        .metric-card-value {
            font-size: var(--text-3xl);
            font-weight: 700;
            margin-bottom: var(--space-2);
        }

        .metric-card-detail {
            font-size: var(--text-sm);
            opacity: 0.8;
        }

        /* ===============================================
           MAIN CONTENT SECTIONS
           =============================================== */

        .main-content {
            background: var(--bg-primary);
            border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
            margin-top: calc(var(--space-12) * -1);
            position: relative;
            z-index: 10;
            padding-top: var(--space-12);
        }

        .section {
            padding: var(--space-12) 0;
            border-bottom: 1px solid var(--border-light);
        }

        .section:last-child {
            border-bottom: none;
        }

        .section-header {
            margin-bottom: var(--space-8);
        }

        .section-title {
            font-size: clamp(var(--text-2xl), 3vw, var(--text-3xl));  /* Slightly smaller */
            font-weight: 600;                /* Lighter weight (was 700) */
            color: var(--text-primary);
            margin-bottom: var(--space-4);
            display: flex;
            align-items: center;
            gap: var(--space-3);
            letter-spacing: -0.02em;         /* Tighter spacing for modern look */
        }

        .section-title-icon {
            /* Removed background - minimal icon only */
            color: var(--primary);
            font-size: var(--text-2xl);      /* Larger but no background */
        }

        .section-description {
            font-size: var(--text-base);      /* Smaller, more minimal */
            font-weight: 400;                 /* Lighter */
            color: var(--text-tertiary);      /* Lighter color */
            line-height: 1.8;                 /* More breathing room */
            max-width: 800px;
        }

        /* Priority Actions Cards */
        .actions-grid {
            display: grid;
            gap: var(--space-6);
            margin-top: var(--space-8);
        }

        .action-card {
            background: var(--bg-primary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-xl);
            padding: var(--space-8);
            position: relative;
            transition: all var(--transition-base);
            box-shadow: var(--shadow-sm);
        }

        .action-card:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
        }

        .action-card.critical {
            border-left: 4px solid var(--danger);
            background: var(--danger-lightest);
        }

        .action-card.high {
            border-left: 4px solid var(--warning);
            background: var(--warning-lightest);
        }

        .action-card.medium {
            border-left: 4px solid var(--primary);
            background: var(--primary-lightest);
        }

        .action-card.low {
            border-left: 4px solid var(--success);
            background: var(--success-lightest);
        }

        .action-header {
            display: flex;
            align-items: flex-start;
            gap: var(--space-4);
            margin-bottom: var(--space-4);
        }

        .action-number {
            min-width: 32px;
            height: 32px;
            background: var(--gray-200);
            border-radius: var(--radius-full);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: var(--text-sm);
        }

        .action-title {
            font-size: var(--text-xl);
            font-weight: 600;
            color: var(--text-primary);
            flex: 1;
        }

        .action-priority {
            padding: var(--space-1) var(--space-3);
            border-radius: var(--radius-full);
            font-size: var(--text-xs);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .priority-critical {
            background: var(--danger);
            color: var(--text-inverse);
        }

        .priority-high {
            background: var(--warning);
            color: var(--text-inverse);
        }

        .priority-medium {
            background: var(--primary);
            color: var(--text-inverse);
        }

        .priority-low {
            background: var(--success);
            color: var(--text-inverse);
        }

        .action-content {
            padding-left: calc(32px + var(--space-4));
        }

        .action-description {
            color: var(--text-secondary);
            margin-bottom: var(--space-4);
            line-height: 1.7;
        }

        .action-impact {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-4);
            margin-bottom: var(--space-4);
        }

        .impact-label {
            font-size: var(--text-sm);
            font-weight: 600;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: var(--space-2);
        }

        .impact-text {
            color: var(--text-primary);
            font-weight: 500;
        }

        .action-recommendation {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            color: var(--primary);
            font-weight: 500;
        }

        /* Implementation Roadmap */
        .roadmap-timeline {
            position: relative;
            padding: var(--space-8) 0;
        }

        .timeline-connector {
            position: absolute;
            left: 20px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(180deg, var(--primary), var(--secondary));
        }

        .roadmap-phase {
            position: relative;
            display: flex;
            gap: var(--space-8);
            margin-bottom: var(--space-10);
        }

        .phase-marker {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-full);
            background: var(--bg-primary);
            border: 3px solid var(--primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: var(--primary);
            position: relative;
            z-index: 2;
            flex-shrink: 0;
        }

        .phase-content {
            flex: 1;
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            padding: var(--space-6);
            border: 1px solid var(--border-light);
        }

        .phase-header {
            margin-bottom: var(--space-4);
        }

        .phase-title {
            font-size: var(--text-xl);
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: var(--space-2);
        }

        .phase-timeline {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-1) var(--space-3);
            background: var(--primary-lightest);
            color: var(--primary);
            border-radius: var(--radius-full);
            font-size: var(--text-sm);
            font-weight: 500;
        }

        .phase-tasks {
            margin-top: var(--space-4);
        }

        .task-item {
            display: flex;
            align-items: flex-start;
            gap: var(--space-3);
            padding: var(--space-3);
            border-radius: var(--radius-lg);
            transition: background var(--transition-fast);
        }

        .task-item:hover {
            background: var(--bg-tertiary);
        }

        .task-checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border-default);
            border-radius: var(--radius-sm);
            margin-top: 2px;
            flex-shrink: 0;
            cursor: pointer;
            transition: all var(--transition-fast);
        }

        .task-checkbox:checked {
            background: var(--success);
            border-color: var(--success);
        }

        .task-label {
            flex: 1;
            color: var(--text-primary);
            cursor: pointer;
            user-select: none;
        }

        /* Screenshots Section */
        .screenshots-grid {
            display: flex;
            gap: var(--space-6);
            margin-top: var(--space-8);
            align-items: flex-start;
            justify-content: center;
            flex-wrap: wrap;
        }

        .screenshot-card {
            background: var(--bg-primary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-xl);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
            transition: all var(--transition-base);
        }

        /* Desktop screenshots - wider */
        .screenshot-card-desktop {
            flex: 1 1 auto;
            min-width: 600px;
            max-width: 750px;
        }

        .screenshot-card-desktop .screenshot-image {
            height: 400px;
            width: 100%;
            object-fit: cover;
            object-position: top;
        }

        /* Mobile screenshots - narrower to look like a phone */
        .screenshot-card-mobile {
            flex: 0 0 auto;
            width: 240px;
            max-width: 240px;
        }

        .screenshot-card-mobile .screenshot-image {
            height: 400px;
            width: 100%;
            object-fit: cover;
            object-position: top;
        }

        .screenshot-card:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
        }

        .screenshot-image {
            width: 100%;
            height: auto;
            display: block;
            border-bottom: 1px solid var(--border-light);
        }

        .screenshot-caption {
            padding: var(--space-4);
            font-size: var(--text-sm);
            color: var(--text-secondary);
            font-weight: 500;
        }

        /* Tables */
        .data-table {
            width: 100%;
            background: var(--bg-primary);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-xl);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }

        .data-table thead {
            background: var(--bg-tertiary);
        }

        .data-table th {
            text-align: left;
            padding: var(--space-4);
            font-weight: 600;
            font-size: var(--text-sm);
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 2px solid var(--border-light);
        }

        .data-table td {
            padding: var(--space-4);
            color: var(--text-primary);
            border-bottom: 1px solid var(--border-light);
        }

        .data-table tbody tr:last-child td {
            border-bottom: none;
        }

        .data-table tbody tr {
            transition: background var(--transition-fast);
        }

        .data-table tbody tr:hover {
            background: var(--bg-secondary);
        }

        /* Footer */
        .report-footer {
            background: var(--bg-tertiary);
            padding: var(--space-12) 0;
            text-align: center;
            border-top: 1px solid var(--border-light);
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .report-footer .container {
            display: flex;
            justify-content: center;
        }

        .footer-content {
            max-width: 400px;
            margin: 0 auto;
            padding: 0 var(--space-6);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .footer-logo {
            font-size: var(--text-xl);
            font-weight: 700;
            color: var(--primary);
            margin-bottom: var(--space-3);
            text-align: center;
        }

        .footer-text {
            color: var(--text-secondary);
            font-size: var(--text-sm);
            line-height: 1.5;
            margin: 0;
            text-align: center;
        }

        /* ===============================================
           RESPONSIVE DESIGN
           =============================================== */

        /* Tablet - 769px to 1024px */
        @media screen and (max-width: 1024px) and (min-width: 769px) {
            .container {
                padding: 0 var(--space-6);
            }

            .metrics-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .score-display-wrapper {
                gap: var(--space-8);
            }
        }

        /* Mobile - up to 768px */
        @media screen and (max-width: 768px) {
            /* Mobile-friendly responsive design */
            html {
                font-size: 16px; /* Standard mobile base */
            }

            body {
                font-size: 1rem;
                line-height: 1.6;
                padding: 0;
            }

            /* Container adjustments */
            .container {
                padding: 0 var(--space-3) !important;
                max-width: 100%;
            }

            /* Section spacing */
            .section {
                padding: var(--space-6) 0;
            }

            /* Typography adjustments */
            .section-title {
                font-size: 1.5rem;
                line-height: 1.3;
            }

            .section-description {
                font-size: 0.95rem;
                line-height: 1.6;
            }

            .action-title {
                font-size: 1.1rem;
                font-weight: 600;
            }

            .action-description {
                font-size: 0.9rem;
                line-height: 1.6;
            }

            p {
                font-size: 0.95rem;
                line-height: 1.6;
            }

            ul li, ol li {
                font-size: 0.9rem;
                line-height: 1.6;
                margin-bottom: 0.4rem;
            }

            /* Hero section mobile */
            .hero-section {
                padding: var(--space-6) 0;
            }

            .company-name {
                font-size: 1.75rem;
                line-height: 1.2;
                margin-bottom: var(--space-2);
            }

            .company-meta {
                font-size: 0.9rem;
            }

            /* Contact info box - mobile friendly */
            .contact-info-box {
                display: block !important;
                width: 100% !important;
                margin-top: var(--space-4) !important;
            }

            .contact-info-box > div {
                flex-direction: column !important;
                gap: 12px !important;
            }

            .contact-info-box a {
                width: 100%;
                justify-content: center;
                padding: 10px 16px !important;
                font-size: 0.95rem !important;
            }

            /* Score display */
            .score-card {
                padding: var(--space-6);
                margin-bottom: var(--space-6);
            }

            .score-display-wrapper {
                flex-direction: column;
                gap: var(--space-4);
            }

            .score-circle {
                width: 120px;
                height: 120px;
            }

            .grade-letter {
                font-size: 2.5rem;
            }

            .score-value {
                font-size: 1rem;
            }

            .score-details {
                text-align: center;
            }

            /* Metrics and grids */
            .metrics-grid {
                grid-template-columns: 1fr;
                gap: var(--space-3);
            }

            .metric-card-value {
                font-size: 1.5rem;
            }

            .metric-card-detail {
                font-size: 0.85rem;
            }

            /* Roadmap and timeline */
            .roadmap-phase {
                flex-direction: column;
                gap: var(--space-4);
            }

            .timeline-connector {
                display: none;
            }

            .action-content {
                padding-left: 0;
            }

            .phase-marker {
                position: relative;
                left: 0;
                margin: 0 auto var(--space-4);
            }

            /* Tables - make scrollable */
            .data-table-container {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }

            .data-table td {
                font-size: 0.85rem;
                padding: var(--space-2);
                line-height: 1.5;
            }

            .data-table th {
                font-size: 0.8rem;
                padding: var(--space-2);
            }

            /* Touch targets - minimum 44px */
            .task-checkbox {
                width: 24px;
                height: 24px;
            }

            .action-number {
                width: 44px;
                height: 44px;
                font-size: 1rem;
                font-weight: 600;
                flex-shrink: 0;
            }

            /* Badges and labels */
            .action-priority {
                font-size: 0.75rem;
                padding: 0.25rem 0.6rem;
            }

            .phase-timeline {
                font-size: 0.8rem;
                padding: 0.3rem 0.6rem;
            }

            .section-title-icon {
                font-size: 1.2rem;
            }

            /* Footer */
            .report-footer {
                padding: var(--space-6) 0;
            }

            .footer-content {
                max-width: 100%;
                padding: 0 var(--space-3);
            }

            .footer-logo {
                font-size: 1.2rem;
                margin-bottom: var(--space-2);
            }

            .footer-text {
                font-size: 0.85rem;
                line-height: 1.6;
            }

            /* Hide desktop-only elements */
            .desktop-only {
                display: none !important;
            }
        }

        @media screen and (max-width: 480px) {
            /* Extra small phones - slightly larger text */
            html {
                font-size: 16px;
            }

            body {
                font-size: 1rem;
                line-height: 1.6;
            }

            /* Slightly larger for readability */
            .section-description,
            .action-description,
            p {
                font-size: 0.95rem;
                line-height: 1.6;
            }

            .section-title {
                font-size: 1.4rem;
                line-height: 1.3;
            }

            .action-title {
                font-size: 1.05rem;
                line-height: 1.4;
            }

            .company-name {
                font-size: 1.5rem;
            }

            /* Ensure labels are readable */
            .metric-label,
            .impact-label,
            .metric-card-title {
                font-size: 0.85rem;
            }

            /* Smaller score circle on very small screens */
            .score-circle {
                width: 100px;
                height: 100px;
            }

            .grade-letter {
                font-size: 2rem;
            }

            /* Tighter spacing */
            .container {
                padding: 0 var(--space-2) !important;
            }

            .section {
                padding: var(--space-5) 0;
            }

            /* Screenshots - stack vertically */
            .screenshots-grid {
                grid-template-columns: 1fr;
            }

            /* Cards - good tap targets */
            .action-card {
                padding: var(--space-4);
            }

            .metric-card {
                padding: var(--space-4);
            }
        }

        /* ===============================================
           PRINT/PDF STYLES - Optimized for PDF Export
           =============================================== */

        @media print {
            /* Base settings */
            html {
                font-size: 12pt; /* Increased from 11pt for better readability */
            }

            body {
                background: white !important;
                color: black !important;
                margin: 0;
                padding: 0;
            }

            /* Force color printing - critical for backgrounds and shadows */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

            /* Container - reduce horizontal padding for print */
            .container {
                padding-left: 16px !important;
                padding-right: 16px !important;
                max-width: 100%;
            }

            /* Hero section - NO page break after, reduce padding */
            .hero-section {
                background: white !important;
                color: black !important;
                page-break-after: auto !important; /* Changed from 'always' to reduce white space */
                padding: 24px 0 !important; /* Reduced from 48px */
                border-bottom: 2px solid #E5E7EB;
                margin-bottom: 16px;
            }

            .company-name {
                color: #111827 !important;
                margin-bottom: 8px !important;
            }

            .company-meta {
                color: #6B7280 !important;
            }

            /* Contact info box - optimize for print */
            .contact-info-box {
                background: #F9FAFB !important;
                border: 1px solid #E5E7EB !important;
                padding: 8px 16px !important;
                margin-top: 12px !important;
            }

            /* Score card - reduce padding */
            .score-card {
                padding: 16px !important;
                margin-bottom: 16px !important;
                background: white !important;
                border: 1px solid #E5E7EB !important;
                box-shadow: none !important;
            }

            .score-circle {
                border: 2px solid #D1D5DB !important;
                background: white !important;
            }

            /* Sections - MUCH reduced padding to fix white space issue */
            .section {
                padding: 12px 0 !important; /* Reduced from 48px - this fixes the white space! */
                margin-bottom: 0 !important;
                border-bottom: 1px solid #E5E7EB;
                page-break-inside: auto; /* Changed from 'avoid' to allow natural breaks */
            }

            .section:last-child {
                border-bottom: none;
            }

            /* Section headers - reduce spacing */
            .section-header {
                margin-bottom: 12px !important; /* Reduced from 32px */
            }

            .section-title {
                font-size: 16pt !important;
                margin-bottom: 6px !important;
                color: #111827 !important;
            }

            .section-description {
                font-size: 10pt !important;
                color: #6B7280 !important;
                line-height: 1.4 !important;
            }

            /* Cards - prevent awkward breaks, but allow if necessary */
            .action-card,
            .metric-card {
                page-break-inside: avoid;
                padding: 12px !important; /* Reduced padding */
                margin-bottom: 8px !important;
                background: white !important;
                border: 1px solid #E5E7EB !important;
                box-shadow: none !important;
            }

            .roadmap-phase {
                page-break-inside: avoid;
                padding: 12px !important;
                margin-bottom: 8px !important;
            }

            /* Action items - reduce spacing */
            .action-number {
                background: #F3F4F6 !important;
                color: #111827 !important;
                border: 1px solid #D1D5DB !important;
            }

            .action-title {
                font-size: 11pt !important;
                color: #111827 !important;
            }

            .action-description {
                font-size: 10pt !important;
                color: #4B5563 !important;
                line-height: 1.4 !important;
            }

            /* Metrics - optimize for print */
            .metrics-grid {
                gap: 8px !important;
            }

            .metric-card-value {
                color: #111827 !important;
            }

            .metric-card-title {
                color: #6B7280 !important;
                font-size: 9pt !important;
            }

            /* Tables - ensure they don't overflow */
            .data-table-container {
                overflow: visible !important;
            }

            .data-table {
                width: 100%;
                font-size: 9pt !important;
            }

            .data-table th {
                background: #F3F4F6 !important;
                color: #111827 !important;
                padding: 6px !important;
                border: 1px solid #D1D5DB !important;
            }

            .data-table td {
                padding: 6px !important;
                border: 1px solid #E5E7EB !important;
                color: #374151 !important;
            }

            /* Screenshots - ensure they fit on page */
            .screenshots-grid {
                gap: 8px !important;
            }

            .screenshot-item {
                page-break-inside: avoid;
                margin-bottom: 8px !important;
            }

            .screenshot-item img {
                max-width: 100% !important;
                height: auto !important;
                border: 1px solid #D1D5DB !important;
            }

            /* Badges and labels - ensure visibility */
            .action-priority,
            .phase-timeline {
                border: 1px solid #D1D5DB !important;
                background: #F9FAFB !important;
                color: #374151 !important;
                font-size: 8pt !important;
            }

            /* Footer - reduce spacing */
            .report-footer {
                padding: 16px 0 !important;
                margin-top: 16px !important;
                border-top: 2px solid #E5E7EB;
            }

            .footer-logo {
                font-size: 12pt !important;
                color: #111827 !important;
            }

            .footer-text {
                font-size: 9pt !important;
                color: #6B7280 !important;
            }

            /* Hide elements that shouldn't print */
            .no-print {
                display: none !important;
            }

            /* Ensure links are visible in print */
            a {
                color: #2563EB !important;
                text-decoration: underline !important;
            }

            /* Paragraph spacing - reduce for print */
            p {
                margin-bottom: 6px !important;
            }

            ul, ol {
                margin-bottom: 8px !important;
            }

            li {
                margin-bottom: 3px !important;
            }
        }

        /* ===============================================
           UTILITY CLASSES
           =============================================== */

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }

        .font-light { font-weight: 300; }
        .font-normal { font-weight: 400; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .font-extrabold { font-weight: 800; }

        .uppercase { text-transform: uppercase; }
        .lowercase { text-transform: lowercase; }
        .capitalize { text-transform: capitalize; }

        .truncate {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .hidden { display: none; }
        .block { display: block; }
        .inline-block { display: inline-block; }
        .flex { display: flex; }
        .grid { display: grid; }

        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .items-end { align-items: flex-end; }

        .justify-center { justify-content: center; }
        .justify-start { justify-content: flex-start; }
        .justify-end { justify-content: flex-end; }
        .justify-between { justify-content: space-between; }

        .gap-1 { gap: var(--space-1); }
        .gap-2 { gap: var(--space-2); }
        .gap-3 { gap: var(--space-3); }
        .gap-4 { gap: var(--space-4); }
        .gap-6 { gap: var(--space-6); }
        .gap-8 { gap: var(--space-8); }

        .mt-1 { margin-top: var(--space-1); }
        .mt-2 { margin-top: var(--space-2); }
        .mt-4 { margin-top: var(--space-4); }
        .mt-6 { margin-top: var(--space-6); }
        .mt-8 { margin-top: var(--space-8); }

        .mb-1 { margin-bottom: var(--space-1); }
        .mb-2 { margin-bottom: var(--space-2); }
        .mb-4 { margin-bottom: var(--space-4); }
        .mb-6 { margin-bottom: var(--space-6); }
        .mb-8 { margin-bottom: var(--space-8); }

        .p-2 { padding: var(--space-2); }
        .p-4 { padding: var(--space-4); }
        .p-6 { padding: var(--space-6); }
        .p-8 { padding: var(--space-8); }

        .rounded { border-radius: var(--radius-md); }
        .rounded-lg { border-radius: var(--radius-lg); }
        .rounded-xl { border-radius: var(--radius-xl); }
        .rounded-full { border-radius: var(--radius-full); }

        .shadow-sm { box-shadow: var(--shadow-sm); }
        .shadow-md { box-shadow: var(--shadow-md); }
        .shadow-lg { box-shadow: var(--shadow-lg); }
        .shadow-xl { box-shadow: var(--shadow-xl); }

        /* Status indicators */
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: var(--radius-full);
            display: inline-block;
        }

        .status-success { background: var(--success); }
        .status-warning { background: var(--warning); }
        .status-danger { background: var(--danger); }
        .status-info { background: var(--primary); }

        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .fade-in {
            animation: fadeIn 0.5s ease-out;
        }

        /* Loading State */
        .skeleton {
            background: linear-gradient(90deg, var(--gray-200) 25%, var(--gray-300) 50%, var(--gray-200) 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
        }

        @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        /* Dark Mode Toggle Button */
        .dark-mode-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            border-radius: var(--radius-full);
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-light);
            box-shadow: var(--shadow-md);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all var(--transition-base);
            z-index: 1000;
        }

        .dark-mode-toggle:hover {
            background-color: var(--bg-tertiary);
            box-shadow: var(--shadow-lg);
            transform: scale(1.05);
        }

        .dark-mode-toggle svg {
            width: 20px;
            height: 20px;
            color: var(--text-primary);
        }

        /* Hide toggle in print mode */
        @media print {
            .dark-mode-toggle {
                display: none !important;
            }

            /* Force light mode for PDF */
            body.dark-mode {
                --primary: #4F46E5;
                --bg-primary: #FFFFFF;
                --bg-secondary: #F9FAFB;
                --bg-tertiary: #FAFAFA;
                --text-primary: #18181B;
                --text-secondary: #52525B;
                --text-tertiary: #71717A;
                --text-inverse: #FFFFFF;
                --border-light: #E4E4E7;
                --border-default: #D4D4D8;
                --border-dark: #A1A1AA;
                background-color: #FFFFFF;
            }
        }
  </style>`;
}
