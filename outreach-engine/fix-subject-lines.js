import { supabase } from './integrations/database.js';

/**
 * Fix subject line duplication in existing data
 * Extract "Subject: ..." from body and clean it up
 */

function cleanEmailField(emailObj) {
  if (!emailObj || !emailObj.body) return emailObj;

  const { subject, body } = emailObj;

  // Check if body starts with "Subject:"
  const match = body.match(/^Subject:\s*(.+?)(\n+)/im);
  if (match) {
    const extractedSubject = match[1].trim();
    const cleanBody = body.replace(/^Subject:\s*.+\n+/im, '').trim();

    return {
      subject: subject || extractedSubject,
      body: cleanBody
    };
  }

  return emailObj;
}

async function fixAllRows() {
  console.log('🔧 Fixing subject line duplication in database...\n');

  // Fetch all rows
  const { data: rows, error: fetchError } = await supabase
    .from('composed_outreach')
    .select('*');

  if (fetchError) throw fetchError;

  console.log(`📥 Found ${rows.length} rows to process\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const updates = {};
    let needsUpdate = false;

    // Check each email field
    const emailFields = ['email_free_value', 'email_portfolio_building', 'email_problem_first'];

    for (const field of emailFields) {
      if (row[field] && row[field].body) {
        const cleaned = cleanEmailField(row[field]);
        if (cleaned.body !== row[field].body) {
          updates[field] = cleaned;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('composed_outreach')
        .update(updates)
        .eq('id', row.id);

      if (updateError) {
        console.error(`❌ Failed to update ${row.company_name}:`, updateError.message);
      } else {
        console.log(`✅ Fixed: ${row.company_name}`);
        updated++;
      }
    } else {
      console.log(`⏭️  Skipped: ${row.company_name} (already clean)`);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ CLEANUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`Updated: ${updated} rows`);
  console.log(`Skipped: ${skipped} rows (already clean)`);
  console.log(`Total: ${rows.length} rows`);
}

fixAllRows()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
