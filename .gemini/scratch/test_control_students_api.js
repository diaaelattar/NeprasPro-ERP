fetch('http://127.0.0.1:3001/api/control/students')
  .then(r => r.json())
  .then(d => {
    console.log('RESULT:', d);
  })
  .catch(console.error);
