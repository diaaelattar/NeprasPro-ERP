fetch('http://127.0.0.1:3001/api/control/verify-pin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: '1234', userName: 'رئيس الكنترول' })
})
  .then(r => r.json())
  .then(d => {
    console.log('PIN VERIFICATION RESULT:', d);
  })
  .catch(console.error);
