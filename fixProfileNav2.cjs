const fs = require('fs');
let profileCode = fs.readFileSync('./src/components/Profile.tsx', 'utf8');

profileCode = profileCode.replace(/  navigate,\n  onAddPost,/, '  parentNavigate,\n  onAddPost,');
profileCode = profileCode.replace(/if \(navigate\) navigate\('PostSettingsScreen'\);/g, "if (parentNavigate) parentNavigate('PostSettingsScreen');");

fs.writeFileSync('./src/components/Profile.tsx', profileCode);

let appCode = fs.readFileSync('./src/App.tsx', 'utf8');
appCode = appCode.replace(/<Profile([\s\S]*?)navigate=\{navigate\}([\s\S]*?)\/>/g, '<Profile$1parentNavigate={navigate}$2/>');
fs.writeFileSync('./src/App.tsx', appCode);

