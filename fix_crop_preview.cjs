const fs = require('fs');
let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const regex = /className="relative w-full h-48 sm:h-64 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing select-none"/;

const newClass = 'className="relative w-full aspect-[3/1] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing select-none"';

content = content.replace(regex, newClass);

fs.writeFileSync('src/components/Profile.tsx', content);
