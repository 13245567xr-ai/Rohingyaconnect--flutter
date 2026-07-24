const fs = require('fs');
let profileCode = fs.readFileSync('./src/components/Profile.tsx', 'utf8');

profileCode = profileCode.replace(/parentNavigate\?: \(path: string, params\?: any\) => void;/, 'parentNavigate?: (path: string, params?: any) => void;');
// wait, I replaced the exact same string. Let me grep for what's inside interface ProfileProps.
