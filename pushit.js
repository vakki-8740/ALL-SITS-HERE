const {execSync} = require('child_process');
const cwd = 'C:\\Users\\VASEEM\\Videos\\WACH TIME\\WORK PLEASE\\ALL F 2';
try {
  execSync('git add -A', {cwd, stdio:'inherit'});
  console.log('Staged all changes');
  execSync('git commit -m "fix: move P1-Admin files to repo root for Vercel deployment"', {cwd, stdio:'inherit'});
  console.log('Committed');
  execSync('git push origin main', {cwd, stdio:'inherit'});
  console.log('Pushed to GitHub');
} catch(e) { console.log('Error:', e.message.substring(0,200)); }
