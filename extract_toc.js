const fs = require('fs');
const content = fs.readFileSync('code_artifact (21).md', 'utf8');
const matches = [...content.matchAll(/<div class="toc-label">(.*?)<\/div>/g)].map(m => m[1]);
console.log(matches.join('\n'));
