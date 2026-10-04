:root {
  --bg: #f4f7fb;
  --panel: #ffffff;
  --primary: #0f172a;
  --accent: #f59e0b;
  --green: #22c55e;
  --red: #ef4444;
  --gray: #94a3b8;
  --border: #e2e8f0;
  --text: #0f172a;
}

* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; font-family: Arial, sans-serif; background: var(--bg); color: var(--text); }
body { padding: 0; }
button, input, select { font: inherit; }
button {
  border: none; border-radius: 10px; background: var(--primary); color: white; padding: 12px 16px; cursor: pointer;
}
input, select {
  width: 100%; background: white; border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-top: 6px;
}
.auth-shell {
  min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #0f172a, #1e293b);
}
.auth-card {
  width: min(92vw, 440px); background: rgba(255,255,255,0.98); border-radius: 22px; padding: 24px; box-shadow: 0 18px 40px rgba(15,23,42,0.18);
}
.brand-row { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.brand-logo {
  width: 52px; height: 52px; display: grid; place-items: center; border-radius: 16px; background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white; font-weight: 700; font-size: 28px;
}
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.app-shell { max-width: 1200px; margin: 0 auto; padding: 18px; }
.topbar {
  display: flex; justify-content: space-between; align-items: center; background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 16px 18px; margin-bottom: 18px;
}
.topbar strong, .topbar small { display: block; }
.content-grid { display: grid; gap: 18px; }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 18px; padding: 18px; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.stat-box { background: #f8fafc; border: 1px solid var(--border); border-radius: 14px; padding: 14px; }
.stat-box span { display: block; color: #64748b; font-size: 12px; }
.stat-box strong { display: block; margin-top: 6px; font-size: 1.1rem; }
.list-block { display: grid; gap: 12px; }
.project-card, .report-card, .notif-card { background: #f8fafc; border: 1px solid var(--border); border-radius: 12px; padding: 12px; }
.row { display: flex; justify-content: space-between; align-items: center; }
.badge { display: inline-flex; background: #dbeafe; color: #1d4ed8; font-size: 11px; border-radius: 999px; padding: 4px 8px; }
@media (min-width: 800px) {
  .content-grid { grid-template-columns: 1fr 1fr; }
  .stats-panel { grid-column: 1 / -1; }
}
