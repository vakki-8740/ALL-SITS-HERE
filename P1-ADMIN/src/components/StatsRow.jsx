function StatCard({ id, tone, value, label, children }) {
  return (
    <div className="stat-card">
      <div className={'stat-icon ' + tone}>{children}</div>
      <div className="stat-value" id={id}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function StatsRow({ total, requests, today }) {
  return (
    <div className="stats-row">
      <StatCard id="kpiTotal" tone="blue" value={total} label="Total Users">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </StatCard>
      <StatCard id="kpiTotalReq" tone="orange" value={requests} label="Total Requests">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </StatCard>
      <StatCard id="kpiToday" tone="green" value={today} label="Today Requests">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </StatCard>
    </div>
  );
}
