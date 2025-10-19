# Server.js Update Instructions

The server.js file needs to be updated to integrate the new features. Here's what needs to be added:

## What to Add

After step 4 (Validate email quality) and before the final `res.json()`, add these new steps:

### Step 5: Generate Technical Reasoning

```javascript
    // 5. Generate technical reasoning
    console.log('\n5️⃣ Generating technical reasoning...');
    const email = emailResult.subjects ? {
      subject: emailResult.subjects[emailResult.recommended?.subject || 0],
      body: emailResult.bodies[emailResult.recommended?.body || 0],
    } : emailResult;

    const reasoning = await generateCompleteReasoning(lead, email, {});
    console.log('   ✓ Reasoning complete');
```

### Step 6: Save to Supabase

```javascript
    // 6. Save to Supabase composed_emails table
    console.log('\n6️⃣ Saving to Supabase...');

    // Calculate quality score
    let qualityScore = 0;
    if (emailResult.subjects && emailResult.bodies) {
      const recSubject = emailResult.recommended?.subject || 0;
      const recBody = emailResult.recommended?.body || 0;
      qualityScore = validateEmail({
        subject: emailResult.subjects[recSubject],
        body: emailResult.bodies[recBody]
      }).score;
    } else {
      qualityScore = validationResults.score;
    }

    const composedEmail = await saveComposedEmail({
      lead_id: lead.id,
      url: lead.url,
      company_name: lead.company_name,
      contact_email: lead.contact_email,
      contact_name: lead.contact_name,
      contact_title: lead.contact_title,
      industry: lead.industry,

      email_subject: email.subject,
      email_body: email.body,
      email_strategy: strategy,

      has_variants: !!emailResult.subjects,
      subject_variants: emailResult.subjects || null,
      body_variants: emailResult.bodies || null,
      recommended_variant: emailResult.recommended || null,
      variant_reasoning: emailResult.reasoning || null,

      technical_reasoning: reasoning.technical_reasoning,
      business_summary: reasoning.business_summary,
      verification_checklist: reasoning.verification_checklist,
      screenshot_urls: null,

      website_verified: !!verificationResult?.success,
      verification_data: verificationResult || null,

      ai_model: process.env.DEFAULT_EMAIL_MODEL || 'claude-sonnet-4-5',
      quality_score: qualityScore,
      validation_issues: validationResults.issues || null,
    });

    console.log(`   ✓ Saved to Supabase: ${composedEmail.id}`);
```

### Step 7: Sync to Notion

```javascript
    // 7. Sync to Notion
    console.log('\n7️⃣ Syncing to Notion...');
    let notionPageId = null;
    try {
      notionPageId = await syncToNotion(composedEmail);
      if (notionPageId) {
        console.log(`   ✓ Synced to Notion: ${notionPageId}`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Notion sync failed: ${error.message}`);
      // Don't fail the whole request if Notion sync fails
    }
```

### Step 8: Update Response

In the final `res.json()`, add these fields:

```javascript
    res.json({
      success: true,
      lead: {
        url: lead.url,
        company: lead.company_name,
        industry: lead.industry,
        grade: lead.lead_grade,
      },
      email: emailResult,
      validation: validationResults,
      verification: verificationResult,

      // ADD THESE TWO LINES:
      supabase_id: composedEmail.id,
      notion_page_id: notionPageId,

      generatedAt: new Date().toISOString(),
    });
```

## Or Just Use This Complete Endpoint

Alternatively, I can create a complete new server.js file with everything integrated. Would you like me to do that instead?

## Test After Update

1. Restart server
2. Run: `curl -X POST http://localhost:3001/api/compose -H "Content-Type: application/json" -d "{\"url\":\"https://squarespace.com\"}"`
3. Check Supabase → `composed_emails` table → See new row
4. Check Notion → See new page with full email + reasoning!
