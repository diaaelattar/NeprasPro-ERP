fetch('http://localhost:3001/api/students?gradeId=7&academicYearId=1&genderOrder=boys_first&limit=10')
  .then(r => r.json())
  .then(d => {
    console.log('SUCCESS:', d.success);
    console.log('STUDENTS COUNT:', d.students?.length);
    console.log('GENDERS:', d.students?.map(s => s.gender));
  })
  .catch(console.error);
