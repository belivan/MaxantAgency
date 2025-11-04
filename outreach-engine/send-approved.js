/**
 * Send all approved emails
 *
 * Usage:
 *   node send-approved.js           (dry run - shows what would send)
 *   node send-approved.js --send    (actually sends emails)
 */

const actualSend = process.argv.includes('--send');

console.log('═══════════════════════════════════════════════════════════════════');
console.log(`📧 SENDING APPROVED EMAILS ${actualSend ? '(LIVE MODE)' : '(DRY RUN)'}`);
console.log('═══════════════════════════════════════════════════════════════════\n');

if (!actualSend) {
  console.log('⚠️  DRY RUN MODE - No emails will actually be sent');
  console.log('   Run with --send flag to actually send emails\n');
}

async function sendApprovedEmails() {
  try {
    const response = await fetch('http://localhost:3002/api/send-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'approved',
        limit: 50,
        actualSend: actualSend
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`\n✅ Found ${data.emails?.length || 0} approved emails\n`);

      if (data.emails && data.emails.length > 0) {
        data.emails.forEach((email, i) => {
          console.log(`${i + 1}. ${email.company_name}`);
          console.log(`   To: ${email.contact_email}`);
          console.log(`   Subject: ${email.subject}`);
          console.log(`   ${actualSend ? '✅ SENT' : '📧 Would send'}\n`);
        });

        if (actualSend) {
          console.log('═══════════════════════════════════════════════════════════════════');
          console.log(`🎉 Successfully sent ${data.sent} emails!`);
          console.log('═══════════════════════════════════════════════════════════════════\n');
        } else {
          console.log('═══════════════════════════════════════════════════════════════════');
          console.log('💡 Run with --send flag to actually send these emails');
          console.log('   node send-approved.js --send');
          console.log('═══════════════════════════════════════════════════════════════════\n');
        }
      } else {
        console.log('📭 No approved emails found');
        console.log('   1. Generate emails with POST /api/compose');
        console.log('   2. Go to Supabase → composed_outreach table');
        console.log('   3. Change status to "approved"');
        console.log('   4. Run this script again\n');
      }
    } else {
      console.log('❌ Error:', data.error);
    }

  } catch (error) {
    console.error('❌ Failed to send emails:', error.message);
    console.error('\nMake sure outreach engine server is running:');
    console.error('  cd outreach-engine && node server.js\n');
  }
}

sendApprovedEmails();
