# VPS Deployment Recipe — Co-tenant Apps on Thai VPS

**Date:** 2026-04-30
**For:** Deploying any new Node.js / Next.js project to `119.59.117.12`
**Pattern source:** clevrgold-dashboard migration (2026-04-30)

---

## 1. What you get

The VPS already runs `easymes` (port 80) and `clevrgold-dashboard` (port 8080). Both share:

- **Postgres 17** at `localhost:5432` (one instance, multiple databases)
- **nginx** Windows service `easymes-nginx` (one instance, `conf.d/*.conf` for each app)
- **NSSM** at `C:\Tools\nssm.exe` (registers Node apps as Windows services)
- **Node.js** in PATH

Adding a new app = **new DB + role + service + nginx server block on a new port**, no shared-state changes.

---

## 2. Pick identifiers up-front

For a new app, decide:

| Slug | What it is | Example (`myapp`) |
|---|---|---|
| `<app>` | App slug — used everywhere | `myapp` |
| `<port-internal>` | Node listen port (localhost only) | `3003` (next free after 3002) |
| `<port-external>` | nginx public port | `8081` (next free after 8080) |
| `<dbname>` | Postgres database | `myapp` |
| `<dbuser>` | Postgres role | `myapp` |

Check what's free first:

```bash
ssh clevrgold-vps 'powershell -Command "Get-NetTCPConnection -State Listen | Select-Object -ExpandProperty LocalPort | Sort-Object -Unique"'
```

---

## 3. Provision Postgres database + role

Generate a password locally — never paste it in chat:

```bash
DBPW=$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)
echo "DATABASE_URL=postgresql://myapp:${DBPW}@127.0.0.1:5432/myapp" >> ~/.myapp-vps-creds
chmod 600 ~/.myapp-vps-creds
```

You need the **postgres superuser** password to create roles. It's in `~/.clevrgold-vps-creds` (`PG_SUPERUSER_PASSWORD`). On the VPS, run:

```powershell
$env:PGPASSWORD = '<PG_SUPERUSER_PASSWORD>'
$psql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe'
& $psql -U postgres -h 127.0.0.1 -d postgres -c "CREATE ROLE myapp WITH LOGIN PASSWORD '<DBPW>'"
& $psql -U postgres -h 127.0.0.1 -d postgres -c "CREATE DATABASE myapp OWNER myapp ENCODING 'UTF8'"
```

Append a `pg_hba.conf` rule **only** if the app needs to connect from outside the VPS (e.g., from a Mac dev box). For app-on-same-VPS deployment, the existing `host all all 127.0.0.1/32 scram-sha-256` rule already covers it — no edit needed.

If external access is needed, append to `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`:

```
hostssl myapp        myapp       0.0.0.0/0    scram-sha-256
```

Then `pg_ctl reload -D 'C:\Program Files\PostgreSQL\17\data'` (no restart).

---

## 4. Deploy the code

Local: build, then ship source (no `node_modules`, no `.next`, no `.env*`):

```bash
cd /path/to/myapp
zip -qr /tmp/myapp.zip . -x 'node_modules/*' '.next/*' '.git/*' '.env*' '*.log'
scp -P 22222 -i ~/.ssh/clevrgold_vps /tmp/myapp.zip administrator@119.59.117.12:'C:/Users/Administrator/'
```

On VPS, extract to `C:\apps\myapp`:

```powershell
$dest = 'C:\apps\myapp'
$zip  = 'C:\Users\Administrator\myapp.zip'
if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
Expand-Archive -Path $zip -DestinationPath $dest -Force

# Write .env.local with strict ANSI line endings (LF breaks Windows env-file parsing)
$envContent = @"
DATABASE_URL=postgresql://myapp:<DBPW>@127.0.0.1:5432/myapp
JWT_SECRET=<random32+>
COOKIE_INSECURE=true
"@
[IO.File]::WriteAllText("$dest\.env.local", $envContent -replace "`n", "`r`n", [Text.Encoding]::ASCII)

# Grant NETWORK SERVICE read access to the app directory + .env.local
icacls $dest /grant 'NETWORK SERVICE:(OI)(CI)RX' /T /Q
icacls "$dest\.env.local" /grant 'NETWORK SERVICE:R'

cd $dest
npm install
npm run build
```

---

## 5. Register as a Windows service via NSSM

```powershell
$nssm = 'C:\Tools\nssm.exe'
$dest = 'C:\apps\myapp'

& $nssm install myapp-api 'C:\Program Files\nodejs\node.exe'
& $nssm set myapp-api AppParameters 'node_modules\next\dist\bin\next start --port 3003'
& $nssm set myapp-api AppDirectory $dest
& $nssm set myapp-api ObjectName 'NT Authority\NetworkService'
& $nssm set myapp-api Start SERVICE_AUTO_START
& $nssm set myapp-api Description 'My App'
& $nssm set myapp-api AppStdout "$dest\logs\service-out.log"
& $nssm set myapp-api AppStderr "$dest\logs\service-err.log"
& $nssm set myapp-api AppRotateFiles 1
& $nssm set myapp-api AppRotateBytes 10485760
& $nssm set myapp-api AppStopMethodConsole 5000

Start-Service myapp-api
```

Verify port 3003 is now listening, and `Invoke-WebRequest http://127.0.0.1:3003/` returns 200/302/etc.

For non-Next.js apps, set `AppParameters` to whatever entrypoint you have (e.g., `dist\index.js` for Express).

---

## 6. nginx reverse proxy

Create `C:\nginx\conf\conf.d\myapp.conf`:

```nginx
server {
    listen 8081;
    server_name _;

    client_max_body_size 25m;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

Then test + reload:

```powershell
cd C:\nginx
cmd /c 'nginx -t'           # must say "test is successful"
Restart-Service easymes-nginx
```

⚠️ **`nginx -s reload` does NOT work** when nginx runs as SYSTEM and you SSH in as Administrator (different security context — `OpenEvent failed: Access is denied`). Use `Restart-Service easymes-nginx` instead. Brief downtime affects all apps behind nginx (~3 sec).

---

## 7. Open Windows Firewall

```powershell
New-NetFirewallRule -Name 'MyApp-8081-In' -DisplayName 'MyApp 8081' `
  -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 8081
```

---

## 8. Verify from outside

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" --max-time 10 http://119.59.117.12:8081/
```

If you get connection refused, the firewall rule didn't apply or service isn't bound to all interfaces. Verify with `netstat -ano | findstr :3003` on VPS — must show `0.0.0.0:3003` or `[::]:3003`, not `127.0.0.1:3003`.

For Next.js the default `next start` listens on `[::]:PORT` (IPv6 any), which nginx hits via `127.0.0.1:PORT` over IPv4. This works because Windows dual-stack allows IPv4-mapped requests to IPv6 sockets. If yours doesn't, pass `--hostname 0.0.0.0` to `next start`.

---

## 9. Watch out for these (lessons learned)

| Trap | Symptom | Fix |
|---|---|---|
| `@neondatabase/serverless` driver | `TypeError: Failed to parse URL from https://api.0.0.1/sql` on every DB call | Swap to `postgres` (porsager) — same tagged-template syntax. May need `as unknown as T[]` casts where Neon's `Record<string, any>[]` was implicitly cast |
| `secure: process.env.NODE_ENV === 'production'` on cookies | Browser silently drops session cookie over plain HTTP, login spins | `secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_INSECURE !== 'true'` + set `COOKIE_INSECURE=true` in `.env.local` until you have HTTPS |
| `.bat` written from Mac with LF line endings | `set DB_URL=...` line ignored, env var never set | Always write `.bat` with CRLF: `[IO.File]::WriteAllText(path, $content -replace "\`n","\`r\`n", [Text.Encoding]::ASCII)` |
| App service runs as NETWORK SERVICE but `.env.local` ACL excludes it | Service starts then silently can't read env, errors out | `icacls .env.local /grant 'NETWORK SERVICE:R'` after creating |
| ESLint blocks Vercel build (`unused-vars` etc) but you redeployed manually | Production runs older artifact than `git log` suggests | Verify with `vercel inspect <url> --logs` if doing Vercel; on VPS just check `BUILD_ID` mtime |
| SSH key = `easymes-vps` overlaps clevrgold | Single revocation kills both | Generate a per-app key (`ssh-keygen -t ed25519 -f ~/.ssh/<app>_vps -N ""`), add its `.pub` to `C:\ProgramData\ssh\administrators_authorized_keys`, configure a host alias in `~/.ssh/config` |
| pg_dump 17.9 emits `\restrict <token>` / `\unrestrict <token>` directives | `psql -v ON_ERROR_STOP=1` aborts on the trailing `\unrestrict` | Strip those lines from the dump or run with `ON_ERROR_STOP=0` for the import only |

---

## 10. Rollback / removal

To remove an app cleanly:

```powershell
Stop-Service myapp-api
& $nssm remove myapp-api confirm
Remove-Item 'C:\nginx\conf\conf.d\myapp.conf'
Restart-Service easymes-nginx
Remove-NetFirewallRule -Name 'MyApp-8081-In'
# If desired:
# DROP DATABASE myapp; DROP ROLE myapp;
# Remove-Item 'C:\apps\myapp' -Recurse -Force
```

---

## 11. Quick reference: ports/services already in use

| Service | Port | DB | nginx external |
|---|---|---|---|
| `easymes-api` | 3001 | `easymes` (role `easymes_app`) | 80 |
| `clevrgold-api` | 3002 | `clevrgold` (role `clevrgold`) | 8080 |
| _next free_ | 3003 | — | 8081 |

Pick the next free row when adding an app.
