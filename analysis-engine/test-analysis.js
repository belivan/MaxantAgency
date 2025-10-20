/**
 * Test analysis with debug output
 */

const url = 'http://localhost:3001/api/analyze-url';
const data = {
  url: 'https://zahavrestaurant.com',
  company_name: 'Zahav Restaurant',
  industry: 'restaurant'
};

console.log('Sending analysis request...\n');

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
  .then(res => res.json())
  .then(result => {
    console.log('Analysis complete!');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
