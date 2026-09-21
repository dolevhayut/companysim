const base=process.env.COMPANYSIM_URL??'http://127.0.0.1:4545';
const result=await fetch(base+'/api/v1/people?limit=5');
if(!result.ok)throw Error('Generate a company and start its runtime first.');
console.log(await result.json());
