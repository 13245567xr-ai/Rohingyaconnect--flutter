const fs = require('fs');
let profileCode = fs.readFileSync('./src/components/Profile.tsx', 'utf8');

profileCode = profileCode.replace(/  navigate\?: \(path: string, params\?: any\) => void;/, '  parentNavigate?: (path: string, params?: any) => void;');

fs.writeFileSync('./src/components/Profile.tsx', profileCode);
