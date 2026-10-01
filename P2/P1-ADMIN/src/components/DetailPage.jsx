import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  getType, typeClass, buildDetailRows,
  IMAGE_FIELDS, isImageUrl, fixImageUrl, esc
} from '../utils';

function Row({ label, value, copy, onCopy }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">
        {value}
        {copy && (
          <button className="copy-btn" onClick={() => onCopy(copy)} aria-label={'Copy ' + label}>
            Copy
          </button>
        )}
      </span>
    </div>
  );
}

export default function DetailPage({ sub, onBack, onToast, onConfirm, onViewImage }) {
  if (!sub) {
    return (
      <div className="empty-state"><p>Not found</p></div>
    );
  }

  const t = getType(sub.type);
  const name = sub.user_name || sub.name || sub.email || 'Unknown';
  const rows = buildDetailRows(sub);

  const identity = rows.slice(0, 3);
  const rest = rows.slice(3);

  const images = IMAGE_FIELDS
    .map((f) => ({ label: f.label, url: fixImageUrl(sub[f.key]) }))
    .filter((f) => isImageUrl(f.url));

  const copy = (val) => {
    navigator.clipboard?.writeText(val)
      .then(() => onToast('Copied', 'success'))
      .catch(() => onToast('Copy failed', 'error'));
  };

  const handleDelete = async () => {
    const ok = await onConfirm('Delete Request', 'Delete this request permanently?');
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'submissions', sub.id));
      onToast('Deleted', 'success');
      onBack();
    } catch (e) {
      console.error(e);
      onToast('Delete failed', 'error');
    }
  };

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="detail-title">Request Details</span>
      </div>

      <div id="detailContent">
        <div className="detail-card">
          <div className="detail-head">
            <img className="detail-avatar" src="/USER-ICON/2288510.png" alt="" />
            <div className="detail-head-text">
              <div className="detail-name">{esc(name)}</div>
              <span className={'type-badge ' + typeClass(t)}>{t}</span>
            </div>
          </div>

          <div className="detail-group">
            {identity.map((r) => <Row key={r.label} {...r} onCopy={copy} />)}
          </div>

          <div className="detail-group">
            {rest.map((r) => <Row key={r.label} {...r} onCopy={copy} />)}
          </div>

          <div className="detail-group">
            <div className="detail-label">Description</div>
            <div className="detail-desc">{esc(sub.description) || '—'}</div>
          </div>

          <div className="detail-group">
            <div className="detail-label">Proof Images</div>
            {images.length ? (
              <div className="view-list">
                {images.map((im) => (
                  <div className="view-row" key={im.label}>
                    <span className="view-name">{im.label}</span>
                    <button className="view-btn" onClick={() => onViewImage(im)}>
                      View
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-desc muted">No image uploaded</div>
            )}
          </div>

          <div className="detail-group detail-acts">
            <button className="btn-red" onClick={handleDelete}>Delete Request</button>
          </div>
        </div>
      </div>
    </div>
  );
}
