import { getType, typeClass, fmtRel, fmtDateShort } from '../utils';

const EMPTY = (
  <div className="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <p>No requests found</p>
  </div>
);

export default function RequestList({ subs, onOpen }) {
  if (!subs.length) return <div className="card-list">{EMPTY}</div>;

  return (
    <div className="card-list">
      {subs.map((s) => {
        const t = getType(s.type);
        const name = s.user_name || s.name || s.email || 'Unknown';
        return (
          <div
            key={s.id}
            className="sub-card"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(s.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(s.id); }}
          >
            <img className="sub-avatar" src="/USER-ICON/2288510.png" alt="" />
            <div className="sub-info">
              <div className="sub-line">
                <span className="sub-name">{name}</span>
                <span className="sub-time">{fmtRel(s.created_at)} · {fmtDateShort(s.created_at)}</span>
              </div>
              <div className="sub-line sub-line-tags">
                <span className={'type-badge ' + typeClass(t)}>{t}</span>
              </div>
            </div>
            <svg className="sub-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
