fetch('http://localhost:3001/api/students?limit=5')
  .then(r => r.json())
  .then(d => {
    console.log('API SUCCESS:', d.success);
    console.log('STUDENTS FETCHED:', d.students?.length);
    if (d.students && d.students.length > 0) {
      console.log('SAMPLE STUDENT KEYS:', Object.keys(d.students[0]));
    }
  })
  .catch(console.error);
