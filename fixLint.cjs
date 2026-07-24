const fs = require('fs');
let code = fs.readFileSync('./src/App.tsx', 'utf8');

code = code.replace(/parentNavigate=\{navigate\}/g, 'navigate={navigate}');
fs.writeFileSync('./src/App.tsx', code);

let profileCode = fs.readFileSync('./src/components/Profile.tsx', 'utf8');
profileCode = profileCode.replace(/parentNavigate\?: \(path: string, params\?: any\) => void;/g, 'navigate?: (path: string, params?: any) => void;');
profileCode = profileCode.replace(/parentNavigate,/g, 'navigate,');
profileCode = profileCode.replace(/if \(parentNavigate\) parentNavigate\('PostSettingsScreen'\);/g, "if (navigate) navigate('PostSettingsScreen');");
fs.writeFileSync('./src/components/Profile.tsx', profileCode);

let feedCode = fs.readFileSync('./src/components/Feed.tsx', 'utf8');
// Fix duplicate Bell: 'MoreHorizontal, Share2, ThumbsUp, ThumbsDown, Reply, Smile, Send, CornerDownRight,\n  Copy, Edit3, Trash2, Pin, Flag, EyeOff, User, X, Bell, BellOff, Link2'
// Bell is already imported at the top in line 4: `Home, PlusCircle, Search, MessageCircle, Video, Users, Bell, Plus, Image,`
feedCode = feedCode.replace(/X, Bell, BellOff, Link2/, 'X, BellOff, Link2');
fs.writeFileSync('./src/components/Feed.tsx', feedCode);
