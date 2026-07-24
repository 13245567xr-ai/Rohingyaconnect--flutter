const fs = require('fs');
let profileCode = fs.readFileSync('./src/components/Profile.tsx', 'utf8');

profileCode = profileCode.replace(/navigate\?: \(path: string, params\?: any\) => void;/, 'parentNavigate?: (path: string, params?: any) => void;');
// The function signature is `export default function Profile({ ..., navigate, ... })`
// Oh wait, `navigate` is an internal function! Wait, I should look at the function signature.
