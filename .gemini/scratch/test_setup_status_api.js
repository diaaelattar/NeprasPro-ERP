fetch('http://localhost:3001/api/setup/status')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
