fetch('http://localhost:3001/api/setup/status')
  .then(r => r.json())
  .then(d => {
    console.log('API RESPONSE:');
    console.log('schoolName:', d.schoolName);
    console.log('governorate:', d.governorate);
    console.log('directorate:', d.directorate);
    console.log('logoUrl len:', d.logoUrl ? d.logoUrl.length : null);
  })
  .catch(console.error);
