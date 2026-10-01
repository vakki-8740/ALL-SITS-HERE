export default function ConfirmDialog({ state, onCancel, onOk }) {
  if (!state) return null;
  return (
    <div
      className="confirm-overlay show"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="confirm-box">
        <h3>{state.title}</h3>
        <p>{state.message}</p>
        <div className="confirm-actions">
          <button className="btn-gray btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn-primary btn-sm" onClick={onOk}>OK</button>
        </div>
      </div>
    </div>
  );
}
