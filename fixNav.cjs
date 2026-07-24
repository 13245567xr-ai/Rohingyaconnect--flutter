const fs = require('fs');
let code = fs.readFileSync('./src/components/Profile.tsx', 'utf8');

code = code.replace(/navigate\?: \(path: string, params\?: any\) => void;/g, 'parentNavigate?: (path: string, params?: any) => void;');
code = code.replace(/navigate,/g, 'parentNavigate,');
code = code.replace(/if \(navigate\) navigate\('PostSettingsScreen'\);/g, "if (parentNavigate) parentNavigate('PostSettingsScreen');");

fs.writeFileSync('./src/components/Profile.tsx', code);

let appCode = fs.readFileSync('./src/App.tsx', 'utf8');
appCode = appCode.replace(/navigate=\{navigate\}/g, 'parentNavigate={navigate}');
fs.writeFileSync('./src/App.tsx', appCode);

