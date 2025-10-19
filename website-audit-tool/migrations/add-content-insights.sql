-- Add content_insights column to leads table
-- This stores AI analysis of blog posts and news for personalization

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS content_insights JSONB;

COMMENT ON COLUMN leads.content_insights IS 'AI analysis of blog/news content: themes, expertise signals, engagement hooks, content gaps, writing style';

-- Example data structure:
-- {
--   "analyzed": true,
--   "hasActiveBlog": true,
--   "postCount": 5,
--   "newsCount": 2,
--   "contentThemes": ["topic1", "topic2", "topic3"],
--   "expertiseSignals": ["expertise1", "expertise2"],
--   "recentAchievements": ["achievement1", "achievement2"],
--   "contentFrequency": "active",
--   "engagementHook": "I saw your recent article on X",
--   "contentGaps": ["gap1", "gap2"],
--   "writingStyle": "professional",
--   "model": "grok-4-fast",
--   "analyzedAt": "2025-10-19T12:00:00.000Z"
-- }
