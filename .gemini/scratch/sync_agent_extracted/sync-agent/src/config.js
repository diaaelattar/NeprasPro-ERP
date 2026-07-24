require('dotenv').config();

function required(name) {
  const val = process.env[name];
  if (!val && val !== '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

module.exports = {
  source: {
    type: required('SOURCE_DB_TYPE'),        // 'sqlite' | 'access'
    path: required('SOURCE_DB_PATH'),
    studentsTable: process.env.SOURCE_STUDENTS_TABLE || 'الطلاب',
    api: {
      baseUrl: process.env.SOURCE_API_BASE_URL || '',
      studentsEndpoint: process.env.SOURCE_API_STUDENTS_ENDPOINT || '/students',
      apiKey: process.env.SOURCE_API_KEY || ''
    }
  },
  control: {
    host: process.env.CONTROL_DB_HOST || 'localhost',
    port: Number(process.env.CONTROL_DB_PORT || 5432),
    database: required('CONTROL_DB_NAME'),
    user: required('CONTROL_DB_USER'),
    password: process.env.CONTROL_DB_PASSWORD || ''
  },
  snapshotDir: process.env.SNAPSHOT_DIR || './tmp'
};
