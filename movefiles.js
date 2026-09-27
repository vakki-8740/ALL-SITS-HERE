const fs = require('fs');
const path = require('path');
const base = 'C:\\Users\\VASEEM\\Videos\\WACH TIME\\WORK PLEASE\\ALL F 2';
const srcDir = path.join(base, 'P1-ADMIN');
const destDir = base;

// Files to move from P1-ADMIN to root
const files = ['index.html', 'styles.css', 'app.js', 'manifest.json', 'sw.js'];
const dirs = ['LOGO', 'USER-ICON'];

async function moveFiles() {
  // Move files
  for (const f of files) {
    const src = path.join(srcDir, f);
    const dest = path.join(destDir, f);
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest);
      console.log('Moved:', f);
    }
  }
  // Move directories
  for (const d of dirs) {
    const src = path.join(srcDir, d);
    const dest = path.join(destDir, d);
    if (fs.existsSync(src)) {
      fs.renameSync(src, dest);
      console.log('Moved:', d + '/');
    }
  }
  // Remove P1-ADMIN folder if empty
  try { fs.rmdirSync(srcDir); console.log('Removed empty P1-ADMIN/'); } catch(e) { console.log('P1-ADMIN/ not empty or already gone:', e.message.substring(0,80)); }
}
moveFiles();
