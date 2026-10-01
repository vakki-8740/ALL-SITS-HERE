const DOT = {
  connected: '#28A745',
  error: '#DC3545',
  cached: '#F57C00',
  connecting: '#F57C00'
};

export default function Topbar({ status }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <img className="topbar-logo" src="/LOGO/logo.jpg" alt="" />
        <div className="topbar-title">P1-Admin</div>
      </div>
      <div className="topbar-right">
        <span
          id="connDot"
          style={{ width: 8, height: 8, borderRadius: '50%', background: DOT[status] || DOT.connecting, display: 'inline-block' }}
        />
      </div>
    </header>
  );
}
