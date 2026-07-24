const fs = require('fs');
let code = fs.readFileSync('src/components/Profile.tsx', 'utf8');

code = code.replace(
  /\{\/\* PROFILE NAV FIX START \*\/\}\n\s*\{\/\* Back Arrow for Other Profile \*\/\}\n\s*\{\!isOwnProfile && \(\n\s*<div className="flex items-center gap-2 mb-4 px-2 cursor-pointer w-max hover:opacity-80" onClick=\{\(\) => \{ if \(parentNavigate\) parentNavigate\('\/feed'\); else if \(onViewProfile\) onViewProfile\(currentUser\.id\); \}\}>\n\s*<ArrowLeft className="w-6 h-6 text-slate-800 dark:text-slate-200" \/>\n\s*<span className="font-bold text-slate-800 dark:text-slate-200">Home<\/span>\n\s*<\/div>\n\s*\)\}\n\{\/\* PROFILE NAV FIX END \*\/\}/g,
  `// BACK BUTTON START\n      {!isOwnProfile && (\n        <div \n          className="flex items-center gap-2 mb-4 px-2 cursor-pointer w-max hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full py-1.5 transition"\n          onClick={() => { if (parentNavigate) parentNavigate('/feed'); else if (onViewProfile) onViewProfile(currentUser.id); }}\n        >\n          <ArrowLeft className="w-5 h-5 text-black dark:text-white" />\n          <span className="font-bold text-black dark:text-white text-[16px]">Home</span>\n        </div>\n      )}\n      // BACK BUTTON END`
);

fs.writeFileSync('src/components/Profile.tsx', code);
