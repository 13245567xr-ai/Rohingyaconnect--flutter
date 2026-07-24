const fs = require('fs');

const files = [
  'src/components/Feed.tsx',
  'src/components/Profile.tsx',
  'src/components/FullScreenImageViewer.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\s*\/\/\s*IMAGE ZOOM START/g, '');
  content = content.replace(/\s*\/\/\s*IMAGE ZOOM END/g, '');
  content = content.replace(/\s*\/\/\s*BACK BUTTON START/g, '');
  content = content.replace(/\s*\/\/\s*BACK BUTTON END/g, '');
  
  if (file === 'src/components/Profile.tsx') {
    content = content.replace(
      '<span className="font-bold text-black dark:text-white text-[16px]">Home</span>',
      '<span className="font-bold text-black dark:text-white text-[16px]">Home (Back)</span>'
    );
  }
  
  fs.writeFileSync(file, content);
}
