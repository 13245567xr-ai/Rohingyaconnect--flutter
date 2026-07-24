const fs = require('fs');
let appCode = fs.readFileSync('./src/App.tsx', 'utf8');

appCode = appCode.replace(/parentNavigate=\{navigate\}/g, 'navigate={navigate}');
// But wait, <Profile /> needs parentNavigate. So we will specifically replace that.
appCode = appCode.replace(/navigate=\{navigate\}\n            onAddPost/g, 'parentNavigate={navigate}\n            onAddPost');
fs.writeFileSync('./src/App.tsx', appCode);

