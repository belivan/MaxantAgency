/**
 * Simple test to check Analysis Engine API error
 */

const TEST_URL = 'http://localhost:3001/api/analyze-url';

async function testAnalysis() {
  console.log('Testing Analysis Engine API with minimal request...\n');

  try {
    const response = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://testsite123unique.com',
        company_name: 'Test Company',
        save_to_database: true,
        project_id: 'ffd7afd1-5ebe-4ad3-8aff-ec9b9547b409'
      })
    });

    const data = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAnalysis();
