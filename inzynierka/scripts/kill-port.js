// scripts/kill-port.js
const { execSync } = require('child_process');

const PORT = String(process.argv[2] || process.env.PORT || 3001);

function killWindows() {
  // Najpewniejsze: Get-NetTCPConnection -> OwningProcess -> Stop-Process
  try {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ` +
      `Select-Object -Expand OwningProcess | Sort-Object -Unique | ForEach-Object { ` +
      `try { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } catch {} }"`,
      { stdio: 'ignore' }
    );
    console.log(`[kill-port] (PS) Killed owners of :${PORT}`);
  } catch {}

  // Rezerwowy netstat -> taskkill
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`, { stdio: 'pipe' }).toString();
    const pids = [...new Set(
      out.split(/\r?\n/).map(l => l.trim().split(/\s+/).pop()).filter(x => /^\d+$/.test(x))
    )];
    pids.forEach(pid => {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[kill-port] Killed PID ${pid} on port ${PORT}`);
      } catch {}
    });
  } catch {}
}

function killUnix() {
  try {
    const out = execSync(`lsof -ti:${PORT}`, { stdio: 'pipe' }).toString();
    const pids = out.split(/\r?\n/).filter(Boolean);
    pids.forEach(pid => {
      try { process.kill(Number(pid), 'SIGKILL'); console.log(`[kill-port] Killed PID ${pid}`); } catch {}
    });
  } catch {}
  try { execSync(`fuser -k ${PORT}/tcp`, { stdio: 'ignore' }); } catch {}
}

if (process.platform === 'win32') killWindows();
else killUnix();
