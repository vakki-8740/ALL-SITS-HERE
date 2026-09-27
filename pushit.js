const {execSync} = require('child_process');
const cwd = 'C:\\Users\\VASEEM\\Videos\\WACH TIME\\WORK PLEASE\\ALL F 2';
try {
  execSync('git add -A && git commit -m "chore: remove temp scripts" && git push origin main', {cwd, stdio:'inherit'});
  console.log('Done');
} catch(e) { console.log('Error:', e.message.substring(0,200)); }
