# A/B Testing Guide - Learn What Actually Works

## 🎯 The Strategy (Option 3)

Instead of guessing which email is best, **let the market tell you!**

### The Concept:

```
Generate 10 emails with variants
↓
Each gets a different subject/body combo
↓
Send them all
↓
Track which get replies
↓
WINNER = The variant that got the most responses
↓
Use that variant for the next 100 emails
```

---

## 📊 **Example: Testing Restaurant Outreach**

### Step 1: Generate Emails for 9 Restaurants

```bash
# Generate email for each lead with variants enabled
POST /api/compose
{
  "url": "https://restaurant1.com",
  "generateVariants": true,
  "strategy": "problem-first"
}
```

**What you get:**

| Lead | AI Picked This Combo |
|------|---------------------|
| Bella Vista Bistro | Subject B + Body 1 |
| Joe's Italian | Subject A + Body 2 |
| Pasta Paradise | Subject C + Body 1 |
| Taco Tower | Subject B + Body 2 |
| Sushi Spot | Subject A + Body 1 |
| Pizza Palace | Subject C + Body 2 |
| Burger Barn | Subject B + Body 1 |
| Diner Deluxe | Subject A + Body 2 |
| Cafe Corner | Subject C + Body 1 |

**Result:** You're testing ALL 6 combinations (3 subjects × 2 bodies) across real leads!

---

### Step 2: Send All Emails

```bash
# Approve all in Supabase (change status to "approved")
# Then send:
node send-approved.js --send
```

**Sends 9 emails with different subject/body combos**

---

### Step 3: Track Responses (1 Week Later)

**Manually track in Supabase:**

| Email ID | Subject Used | Body Used | Got Reply? | Days to Reply |
|----------|-------------|-----------|------------|---------------|
| 1 | B | 1 | ✅ Yes | 2 |
| 2 | A | 2 | ❌ No | - |
| 3 | C | 1 | ❌ No | - |
| 4 | B | 2 | ✅ Yes | 3 |
| 5 | A | 1 | ❌ No | - |
| 6 | C | 2 | ❌ No | - |
| 7 | B | 1 | ✅ Yes | 1 |
| 8 | A | 2 | ❌ No | - |
| 9 | C | 1 | ✅ Yes | 4 |

**Analysis:**
```
Subject A: 0/3 replies (0% response rate) ❌
Subject B: 3/3 replies (100% response rate) ✅ WINNER!
Subject C: 1/3 replies (33% response rate)

Body 1: 3/5 replies (60% response rate) ✅ WINNER!
Body 2: 1/4 replies (25% response rate)

BEST COMBO: Subject B + Body 1 (100% reply rate!)
```

---

### Step 4: Use Winner for Next Batch

Now you KNOW what works! Generate 50 more emails:

```bash
# Generate with variants
POST /api/compose (for 50 leads)

# Then manually edit in Supabase:
# Change ALL to use Subject B + Body 1
```

**Expected results:** Way higher reply rate! 📈

---

## 🔬 **Advanced: Structured A/B Test**

### Test Design:

**Hypothesis:** "Subject lines mentioning specific issues get more replies than generic ones"

**Test Groups:**

**Group A (Control - 20 leads):**
- Subject: "quick website refresh for [company]"
- Body: Standard template

**Group B (Test - 20 leads):**
- Subject: "noticed [specific issue] on [company] site"
- Body: Same standard template

**Track:**
- Open rate (if using tracking pixels)
- Reply rate
- Positive vs negative replies
- Time to first reply

**After 2 weeks:**
- Compare reply rates
- Winner = Use for all future emails

---

## 📊 **Tracking Results in Supabase**

### Add Custom Columns (Optional):

In Supabase `composed_emails` table, add:

1. **replied_at** (timestamptz) - When they replied
2. **reply_sentiment** (text) - "positive", "negative", "neutral"
3. **test_group** (text) - Which variant they got
4. **reply_text** (text) - What they said

### Query Performance:

```sql
-- See which variant performed best
SELECT
  CASE
    WHEN email_subject LIKE '%design update%' THEN 'Subject B'
    WHEN email_subject LIKE '%quick refresh%' THEN 'Subject A'
    ELSE 'Subject C'
  END as subject_variant,
  COUNT(*) as sent,
  COUNT(replied_at) as replies,
  ROUND(100.0 * COUNT(replied_at) / COUNT(*), 1) as reply_rate
FROM composed_emails
WHERE status = 'sent'
GROUP BY subject_variant
ORDER BY reply_rate DESC;
```

**Output:**
```
subject_variant | sent | replies | reply_rate
----------------|------|---------|------------
Subject B       |   3  |    3    |   100.0%  ✅
Subject C       |   3  |    1    |    33.3%
Subject A       |   3  |    0    |     0.0%
```

---

## 🎯 **Best Practices**

### 1. **Test One Variable at a Time**

**Good:**
- Keep body same, test 3 different subjects

**Bad:**
- Change subject AND body AND strategy AND time sent
- (You won't know what caused the difference!)

### 2. **Use Similar Leads**

**Good:**
- Test all variants on restaurants in Philadelphia

**Bad:**
- Test Subject A on restaurants, Subject B on law firms
- (Different industries respond differently!)

### 3. **Wait Long Enough**

**Good:**
- Wait 7-14 days for responses

**Bad:**
- Check after 1 day and declare winner
- (Some people take a week to reply!)

### 4. **Sample Size Matters**

**Good:**
- Test each variant on at least 10 leads

**Bad:**
- Test on 1-2 leads per variant
- (Too small to be statistically significant!)

### 5. **Track Everything**

Even negative results are valuable!

- "Subject A got 0 replies → Never use again"
- "Problem-first strategy works better than compliment-sandwich"
- "Emails sent Tuesday get 2x more replies than Friday"

---

## 💡 **Quick Wins to Test**

### Test 1: Subject Line Style

- A: Question format - "Quick question about [company] website?"
- B: Problem statement - "Noticed [issue] on [company] site"
- C: Benefit focused - "3 quick wins for [company] online presence"

### Test 2: Email Length

- A: Short (2 sentences)
- B: Medium (4 sentences)
- C: Long (6+ sentences with bullet points)

### Test 3: Call to Action

- A: "Interested in a free audit?"
- B: "Want me to send over specifics?"
- C: "Should I send you a quick video?"

### Test 4: Personalization Level

- A: Generic template
- B: Mentions specific issue
- C: Mentions specific issue + their reviews/rating

### Test 5: Sending Time

- A: Send Monday 9am
- B: Send Tuesday 2pm
- C: Send Thursday 10am

---

## 📈 **Expected Results**

**Typical cold email stats:**
- Open rate: 40-60%
- Reply rate: 5-15%
- Positive reply rate: 2-5%

**With good A/B testing:**
- Open rate: 60-80% ✅
- Reply rate: 15-30% ✅
- Positive reply rate: 8-12% ✅

**Your goal:**
Find the winning combo that gets you into the top tier!

---

## 🚀 **Action Plan**

**Week 1:**
- Generate 20 emails with variants
- Send all (different combos)
- Track replies in Supabase

**Week 2:**
- Analyze which variant won
- Generate 50 emails using ONLY the winner
- Compare results to Week 1

**Week 3:**
- Test something new (CTA, time, personalization)
- Keep iterating

**After 1 month:**
- You'll have a proven email template
- You'll know best time to send
- You'll know which industries respond best
- You'll have optimized your whole process! 🎯

---

## ✅ **Why This Is So Powerful**

**Traditional approach:**
- Write one email
- Hope it works
- Never know what could have worked better

**A/B testing approach:**
- Test multiple options
- Let real data decide
- Continuously improve
- Know exactly what works

**Real example:**
- Before: 5% reply rate (5 replies per 100 emails)
- After A/B testing: 20% reply rate (20 replies per 100 emails)
- **Result: 4x more conversations with SAME effort!** 🚀

---

Start testing today and let me know what you discover!
