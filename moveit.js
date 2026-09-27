const {execSync} = require('child_process');
const cwd = 'C:\\Users\\VASEEM\\Videos\\WACH TIME\\WORK PLEASE\\ALL F 2';
try {
  execSync('git rm -r "WASEEM BHAI PARIMATCH 1/P1-ADMIN"', {cwd, stdio:'inherit'});
  console.log('Removed from old location');
} catch(e) {
  console.log('Remove failed (may not be tracked):', e.message.substring(0,100));
}
try {
  execSync('git add P1-ADMIN/', {cwd, stdio:'inherit'});
  console.log('Added to new location');
} catch(e) {
  console.log('Add failed:', e.message.substring(0,100));
}
try {
  const status = execSync('git status --short', {cwd, encoding:'utf8'});
  console.log('\nStatus:\n' + status);
} catch(e) {}
