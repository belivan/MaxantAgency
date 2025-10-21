/**
 * Test: Verify the validator catches bad emails
 */

import { validateEmail } from './validators/email-validator.js';

console.log('\n🧪 TESTING EMAIL VALIDATOR\n');
console.log('─'.repeat(60));

// Test 1: Good email
console.log('\n1️⃣  Testing GOOD email...');
const goodEmail = {
  subject: 'quick question about your website',
  body: 'Hi there, I noticed your site loads slowly on mobile. This could be costing you customers. Want me to send over 2 quick fixes? Takes 5 minutes.'
};

const goodResult = validateEmail(goodEmail);
console.log(`   Score: ${goodResult.score}/100 (${goodResult.rating})`);
console.log(`   Valid: ${goodResult.isValid}`);
if (goodResult.issues.length > 0) {
  console.log(`   Issues: ${goodResult.issues.length}`);
}

// Test 2: Email with [object Object]
console.log('\n2️⃣  Testing email with [object Object]...');
const badEmail1 = {
  subject: 'quick question about your website',
  body: 'Hi [object Object], I noticed your site has issues. The problem is [object Object] which is causing slow load times.'
};

const badResult1 = validateEmail(badEmail1);
console.log(`   Score: ${badResult1.score}/100 (${badResult1.rating})`);
console.log(`   Valid: ${badResult1.isValid}`);
console.log(`   Issues: ${badResult1.issues.length}`);
if (badResult1.issues.length > 0) {
  badResult1.issues.forEach(issue => {
    console.log(`     - ${issue.issue || issue}`);
  });
}

// Test 3: Email with "Could you provide"
console.log('\n3️⃣  Testing email with meta-prompt...');
const badEmail2 = {
  subject: 'quick question about your website',
  body: 'I apologize, but I need more information. Could you provide the specific details about the website issues?'
};

const badResult2 = validateEmail(badEmail2);
console.log(`   Score: ${badResult2.score}/100 (${badResult2.rating})`);
console.log(`   Valid: ${badResult2.isValid}`);
console.log(`   Issues: ${badResult2.issues.length}`);
if (badResult2.issues.length > 0) {
  badResult2.issues.forEach(issue => {
    console.log(`     - ${issue.issue || issue}`);
  });
}

// Test 4: Email with undefined
console.log('\n4️⃣  Testing email with "undefined"...');
const badEmail3 = {
  subject: 'quick question about undefined',
  body: 'Hi there, I noticed undefined on your website.'
};

const badResult3 = validateEmail(badEmail3);
console.log(`   Score: ${badResult3.score}/100 (${badResult3.rating})`);
console.log(`   Valid: ${badResult3.isValid}`);
console.log(`   Issues: ${badResult3.issues.length}`);
if (badResult3.issues.length > 0) {
  badResult3.issues.forEach(issue => {
    console.log(`     - ${issue.issue || issue}`);
  });
}

console.log('\n─'.repeat(60));
console.log('\n✅ Validator Test Complete\n');
