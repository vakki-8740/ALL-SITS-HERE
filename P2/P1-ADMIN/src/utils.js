export function esc(s) {
  return s == null ? '' : String(s);
}

export function toDate(ts) {
  if (!ts) return null;
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtTime(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

export function fmtRel(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd';
  return fmtTime(ts);
}

/* Compact card timestamp: "28 Sept", with the year only when it is not this year. */
export function fmtDateShort(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  const day = d.toLocaleString('en-IN', { day: '2-digit', month: 'short' });
  return d.getFullYear() === new Date().getFullYear() ? day : day + ' ' + d.getFullYear();
}

export function isImageUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s) && !/\.(mp4|webm|mov)$/i.test(s);
}

/* The Parimatch forms save Telegram photo links as
     https://api.telegram.org/bot<TOKEN>/file/photos/x.jpg
   which 404s - the working form is
     https://api.telegram.org/file/bot<TOKEN>/photos/x.jpg               */
export function fixImageUrl(u) {
  if (typeof u !== 'string') return u;
  return u.replace(/^(https:\/\/api\.telegram\.org)\/bot([^/]+)\/file\/(.+)$/i, '$1/file/bot$2/$3');
}

/* Image fields written by the Parimatch project */
export const IMAGE_FIELDS = [
  { key: 'issue_image_url', label: 'Issue Image' },
  { key: 'aadhar_front_url', label: 'Aadhaar Front' },
  { key: 'aadhar_back_url', label: 'Aadhaar Back' },
  { key: 'selfie_url', label: 'Selfie' },
  { key: 'identity_image_url', label: 'Identity Image' },
  { key: 'bank_statement_1_url', label: 'Bank Statement 1' },
  { key: 'bank_statement_2_url', label: 'Bank Statement 2' },
  { key: 'bonus_issue_image_url', label: 'Bonus Issue Image' },
  { key: 'profile_image_url', label: 'Profile Image' }
];

export function getType(type) {
  if (!type) return 'Other';
  const t = String(type).toLowerCase();
  if (t.includes('deposit')) return 'Deposit Problem';
  if (t.includes('unlock') || t.includes('unblock')) return 'unlock_withdrawal';
  if (t.includes('withdrawal') || t.includes('withdraw')) return 'Withdrawal Problem';
  if (t.includes('bonus')) return 'bonus_problem';
  if (t.includes('kyc') || t.includes('document')) return 'KYC Problem';
  if (t.includes('bank') && t.includes('statement')) return 'Bank Statement Problem';
  if (t.includes('chat') || t.includes('live')) return 'Live Chat';
  return type;
}

const TYPE_CLASS = {
  'Deposit Problem': 'deposit',
  'Withdrawal Problem': 'withdrawal',
  'unlock_withdrawal': 'unblock',
  'bonus_problem': 'bonus',
  'KYC Problem': 'kyc',
  'Bank Statement Problem': 'bank',
  'Live Chat': 'chat'
};

export function typeClass(t) {
  return TYPE_CLASS[t] || 'deposit';
}

/* Rows shown on the detail page, in order. Empty values become an em dash. */
export function buildDetailRows(s) {
  const rows = [];
  const push = (label, value) => rows.push({
    label,
    value: value == null || value === '' ? '—' : String(value)
  });

  // Copy button only for these three.
  const email = s.email || '—';
  const mobile = s.mobile || '—';
  const password = s.password || '—';
  rows.push({ label: 'Email ID', value: email, copy: email !== '—' ? email : null });
  rows.push({ label: 'Mobile Number', value: mobile, copy: mobile !== '—' ? mobile : null });
  rows.push({ label: 'Password', value: password, copy: password !== '—' ? password : null });

  push('Status', s.issue_status || 'Pending');
  push('Amount', s.amount || s.bonus_amount);
  push('UTR', s.utr || 'N/A');
  push('Method', s.withdraw_method);
  // unlock/bonus forms post reqId + time, the other forms request_id + timestamp
  if (s.account_number) push('Account Number', s.account_number);
  push('Request ID', s.request_id || s.reqId);
  push('Game ID', s.game_id);
  push('Date', s.timestamp || s.time);
  push('Source', s.source);

  return rows;
}

export function searchHaystack(s) {
  return [
    s.email, s.mobile, s.user_name, s.name, s.description, s.type,
    s.request_id, s.reqId, s.game_id, s.amount, s.bonus_amount,
    s.utr, s.account_number, s.issue_status
  ].map(v => (v == null ? '' : String(v)).toLowerCase()).join(' ');
}
