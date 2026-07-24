const fs = require('fs');
let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

// fix the banner container rendering
content = content.replace(
  /<div className="w-full h-48 sm:h-64 bg-slate-100 dark:bg-slate-950 relative group">/g,
  '<div className="w-full aspect-[3/1] bg-slate-100 dark:bg-slate-950 relative group overflow-hidden">'
);

// fix the image rendering class
content = content.replace(
  /className="w-full h-full object-cover"/g,
  'className="w-full h-full object-contain"'
);

fs.writeFileSync('src/components/Profile.tsx', content);
