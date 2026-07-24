const fs = require('fs');
let code = fs.readFileSync('./src/App.tsx', 'utf8');

// remove duplicate navigate={navigate}
code = code.replace(/navigate={navigate}\n            onFollowToggle={handleFollowToggle}\n            navigate={navigate}/g, 'navigate={navigate}\n            onFollowToggle={handleFollowToggle}');

const target = `            onFollowToggle={handleFollowToggle}
            onAddPost={handleAddPost}`;
const replacement = `            onFollowToggle={handleFollowToggle}
            navigate={navigate}
            onAddPost={handleAddPost}`;
code = code.replace(target, replacement);

fs.writeFileSync('./src/App.tsx', code);
