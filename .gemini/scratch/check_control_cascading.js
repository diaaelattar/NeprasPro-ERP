const fetch = require('node-fetch');

async function testCascading() {
  console.log('--- TESTING SECTION / STAGE / GRADE CASCADING ENDPOINTS ---');
  try {
    const resSections = await fetch('http://127.0.0.1:3001/api/settings/sections');
    const sections = await resSections.json();
    console.log('SECTIONS:', sections);

    const resStages = await fetch('http://127.0.0.1:3001/api/settings/stages');
    const stages = await resStages.json();
    console.log('STAGES:', stages);

    const resControlGrades = await fetch('http://127.0.0.1:3001/api/control/grades');
    const grades = await resControlGrades.json();
    console.log('CONTROL GRADES:', grades);
  } catch (e) {
    console.error(e);
  }
}

testCascading();
