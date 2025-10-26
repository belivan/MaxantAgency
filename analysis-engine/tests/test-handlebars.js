/**
 * Test Handlebars Processing
 */

const Handlebars = (await import('handlebars')).default;

const template = `
Company: {{company_name}}
Industry: {{industry}}

{{#if business_intelligence}}
Has BI: YES
Employee Count: {{business_intelligence.employee_count}}
{{/if}}

{{#each benchmarks}}
- Benchmark {{@index}}: {{this.company_name}} ({{this.industry}})
{{/each}}
`;

const data = {
  company_name: 'Test Co',
  industry: 'restaurant',
  business_intelligence: {
    employee_count: 50
  },
  benchmarks: [
    { company_name: 'Sweetgreen', industry: 'restaurant' },
    { company_name: 'Chipotle', industry: 'restaurant' }
  ]
};

const compiled = Handlebars.compile(template);
const result = compiled(data);

console.log('✅ HANDLEBARS TEST:');
console.log(result);
