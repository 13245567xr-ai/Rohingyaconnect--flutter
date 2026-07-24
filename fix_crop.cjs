const fs = require('fs');
let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

// fix the banner container rendering
content = content.replace(
  /<div className="w-full h-48 sm:h-64 bg-slate-100 dark:bg-slate-950 relative group">/g,
  '<div className="w-full aspect-[3/1] bg-slate-100 dark:bg-slate-950 relative group overflow-hidden">'
);

// fix the drawing logic for crop
const oldDraw = `        const drawWidth = width * cropScale;
        const drawHeight = height * cropScale;
        const drawX = (width - drawWidth) / 2 + cropOffsetX;
        const drawY = (height - drawHeight) / 2 + cropOffsetY;
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);`;

const newDraw = `        // Calculate cover proportions (object-fit: contain/cover logic)
        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;
        let baseDrawWidth = width;
        let baseDrawHeight = height;
        
        if (imgAspect > canvasAspect) {
          // image is wider than canvas
          baseDrawHeight = height;
          baseDrawWidth = height * imgAspect;
        } else {
          // image is taller than canvas
          baseDrawWidth = width;
          baseDrawHeight = width / imgAspect;
        }
        
        const drawWidth = baseDrawWidth * cropScale;
        const drawHeight = baseDrawHeight * cropScale;
        const drawX = (width - drawWidth) / 2 + cropOffsetX;
        const drawY = (height - drawHeight) / 2 + cropOffsetY;
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);`;

content = content.replace(oldDraw, newDraw);

fs.writeFileSync('src/components/Profile.tsx', content);
