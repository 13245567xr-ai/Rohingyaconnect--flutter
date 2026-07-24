const fs = require('fs');
let content = fs.readFileSync('src/components/Profile.tsx', 'utf8');

const regex = /const drawWidth = width \* cropScale;\s*const drawHeight = height \* cropScale;\s*const drawX = \(width - drawWidth\) \/ 2 \+ cropOffsetX;\s*const drawY = \(height - drawHeight\) \/ 2 \+ cropOffsetY;\s*ctx\.drawImage\(img, drawX, drawY, drawWidth, drawHeight\);/;

const newDraw = `        // Calculate cover proportions (object-fit: cover logic)
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

content = content.replace(regex, newDraw);

fs.writeFileSync('src/components/Profile.tsx', content);
console.log(regex.test(fs.readFileSync('src/components/Profile.tsx', 'utf8')) ? "Failed" : "Success");
