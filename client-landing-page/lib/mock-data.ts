export interface MockReport {
  id: string;
  company_name: string;
  url: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  overall_score: number;
  design_score: number;
  seo_score: number;
  content_score: number;
  social_score: number;
  executive_summary: string;
  top_priority: string;
  top_issues: string[];
  quick_wins: string[];
  analyzed_at: string;
}

export const mockReports: MockReport[] = [
  {
    id: '1',
    company_name: 'Bella Vista Restaurant',
    url: 'bellavista-restaurant.com',
    grade: 'C',
    overall_score: 62,
    design_score: 58,
    seo_score: 71,
    content_score: 60,
    social_score: 55,
    executive_summary: 'Bella Vista Restaurant has a functional website with decent SEO fundamentals, but the user experience—especially on mobile devices—is significantly hindering conversion potential. The site shows signs of dated design patterns with accessibility issues affecting call-to-action visibility. While the restaurant has good content structure, poor mobile navigation and slow page load times are likely causing visitor drop-off before they can make a reservation or place an order.',
    top_priority: 'Fix mobile navigation and page speed issues. Over 70% of restaurant website traffic comes from mobile devices, and your current 4+ second load time combined with difficult navigation is costing you customers daily.',
    top_issues: [
      'Mobile menu is difficult to navigate and requires multiple taps',
      'Missing meta descriptions on 8 out of 12 pages',
      'Call-to-action buttons lack sufficient color contrast',
      'Page load time exceeds 4 seconds on mobile devices',
      'Social media links are not prominently displayed'
    ],
    quick_wins: [
      'Add meta descriptions to all pages',
      'Increase CTA button contrast ratio',
      'Add Instagram feed widget to homepage',
      'Optimize images (reduce file sizes by 60%)',
      'Add click-to-call button in mobile header'
    ],
    analyzed_at: '2025-11-05T10:30:00Z'
  },
  {
    id: '2',
    company_name: 'Sunshine Plumbing Services',
    url: 'sunshineplumbing.com',
    grade: 'D',
    overall_score: 48,
    design_score: 42,
    seo_score: 55,
    content_score: 50,
    social_score: 45,
    executive_summary: 'Sunshine Plumbing Services is operating with a critically outdated website that fails to meet modern web standards and user expectations. The lack of mobile responsiveness alone is disqualifying your business from the majority of potential customers who search for emergency plumbing services on their phones. Combined with buried contact information and weak calls-to-action, this website is actively costing you emergency service calls that are going to competitors with more accessible sites.',
    top_priority: 'Implement mobile-responsive design immediately. For service-based businesses, 80%+ of emergency calls come from mobile searches. Your non-responsive site is invisible to mobile users and losing you high-value emergency service revenue every day.',
    top_issues: [
      'Website is not mobile-responsive',
      'No clear call-to-action above the fold',
      'Contact information is buried in footer',
      'Missing Google Business Profile integration',
      'Outdated testimonials from 2019'
    ],
    quick_wins: [
      'Add prominent phone number in header',
      'Create mobile-responsive layout',
      'Add emergency service badge',
      'Update testimonials with recent reviews',
      'Add service area map'
    ],
    analyzed_at: '2025-11-04T14:20:00Z'
  },
  {
    id: '3',
    company_name: 'Elite Fitness Center',
    url: 'elitefitness.com',
    grade: 'B',
    overall_score: 78,
    design_score: 82,
    seo_score: 76,
    content_score: 75,
    social_score: 80,
    executive_summary: 'Elite Fitness Center has built a strong digital presence with modern design, good SEO fundamentals, and active social media integration. The website successfully communicates the brand energy and appeals to fitness enthusiasts. However, there are friction points in the membership conversion funnel—specifically around pricing transparency and class schedule accessibility—that are preventing prospects from taking the next step. These issues are relatively minor but represent significant conversion optimization opportunities.',
    top_priority: 'Clarify membership pricing structure and add transparent pricing comparison. Fitness prospects want to know costs upfront before committing to a visit. Clear pricing will reduce friction in your sales funnel and increase qualified leads by 25-40%.',
    top_issues: [
      'Class schedule page loads slowly',
      'Membership pricing is unclear',
      'Before/after photos need better quality'
    ],
    quick_wins: [
      'Add pricing comparison table',
      'Optimize schedule page loading',
      'Add video testimonials',
      'Create FAQ section'
    ],
    analyzed_at: '2025-11-03T09:15:00Z'
  }
];

export function findReportByQuery(query: string): MockReport | null {
  const lowerQuery = query.toLowerCase().trim();

  const report = mockReports.find(r =>
    r.company_name.toLowerCase().includes(lowerQuery) ||
    r.url.toLowerCase().includes(lowerQuery)
  );

  return report || null;
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
    case 'B': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950';
    case 'C': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
    case 'D': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950';
    case 'F': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
    default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 55) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}
