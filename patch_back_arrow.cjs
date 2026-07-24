const fs = require('fs');
let code = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const backButtonCode = `// PROFILE NAV FIX START
      {/* Back Arrow for Other Profile */}
      {!isOwnProfile && (
        <div className="flex items-center gap-2 mb-4 px-2 cursor-pointer w-max hover:opacity-80" onClick={() => parentNavigate?.('/feed') || onViewProfile?.(currentUser.id)}>
          <ArrowLeft className="w-6 h-6 text-slate-800 dark:text-slate-200" />
          <span className="font-bold text-slate-800 dark:text-slate-200">Home</span>
        </div>
      )}
// PROFILE NAV FIX END
      {/* 1. NATIVE PROFILE HEADER SECTION */}`;

code = code.replace('{/* 1. NATIVE PROFILE HEADER SECTION */}', backButtonCode);
fs.writeFileSync('src/components/Profile.tsx', code);
