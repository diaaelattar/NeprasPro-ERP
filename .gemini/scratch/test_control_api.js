fetch('http://localhost:3001/api/control/stats')
  .then(r => r.json())
  .then(d => {
    console.log('CONTROL API SUCCESS:', d.success);
    console.log('STATS:', d.stats);
  })
  .catch(console.error);
