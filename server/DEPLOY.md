# Doppler — Café PC Deployment (Windows 11)

The Node server lives in `server/` inside the site repo. It serves the static site
(`order.html`, `admin.html`, `index.html`, assets) **and** the API from the same origin,
so the customer order page, the admin console, and the database all run from this one PC.

## 1. Prerequisites
- Install Node.js 18+ and PostgreSQL.
- Create the database and role (run in an elevated `psql` as the `postgres` superuser):
  ```
  psql -U postgres -c "CREATE ROLE doppler LOGIN PASSWORD 'choose-a-strong-pw';"
  psql -U postgres -c "CREATE DATABASE doppler OWNER doppler;"
  ```

## 2. App setup (from the `server/` folder)
```
copy .env.example .env
:: then edit .env:
::   DATABASE_URL  -> postgres://doppler:choose-a-strong-pw@localhost:5432/doppler
::   SESSION_SECRET-> a long random string
::   PUBLIC_BASE_URL-> https://app.<yourdomain>  (set after step 4)
npm install
npm run init-db
npm run create-user -- owner@doppler.coffee a-strong-password
```
`npm run init-db` prints `schema applied`. `npm test` should report 7 passing tests.
Optionally load sample seats: `psql -U doppler -d doppler -f seed.sql`.

## 3. Keep it running (pm2)
```
npm install -g pm2 pm2-windows-startup
pm2-startup install
pm2 start index.js --name doppler
pm2 save
```

## 4. Expose on your domain (Cloudflare Tunnel — free HTTPS, no port-forwarding)
1. Add your GoDaddy domain to Cloudflare (free plan). At GoDaddy, change the
   nameservers to the two Cloudflare provides. Wait until the domain shows "Active".
2. Install `cloudflared`, then:
   ```
   cloudflared tunnel login
   cloudflared tunnel create doppler
   cloudflared tunnel route dns doppler app.<yourdomain>
   ```
3. Create the tunnel config (`%USERPROFILE%\.cloudflared\config.yml`):
   ```yaml
   tunnel: doppler
   credentials-file: C:\Users\<you>\.cloudflared\<tunnel-id>.json
   ingress:
     - hostname: app.<yourdomain>
       service: http://localhost:3000
     - service: http_status:404
   ```
   Then test and install as a service:
   ```
   cloudflared tunnel run doppler
   cloudflared service install
   ```
4. In **admin → Points**, set **Site base URL** to `https://app.<yourdomain>`, save,
   then (re)generate and print the seat QR codes from **Seats & QR**.

## 5. Verify end to end
- Visit `https://app.<yourdomain>/admin.html` from a phone on **cellular** → staff login works over HTTPS.
- Scan a seat QR → the order page loads, you can place an order, and it appears on the
  admin Orders board live. Advance status → the customer's screen updates. Mark paid →
  points are credited and visible under Customers.

## Backups
Schedule a daily dump (Task Scheduler):
```
pg_dump -U doppler doppler > backup-%DATE%.sql
```

## Notes
- Ordering depends on this PC being **on** with **internet up** (traffic routes through Cloudflare).
- Change the staff password any time with `npm run create-user -- <email> <newpassword>` (upserts).
- The old client-side admin passcode is gone; admin is now gated by real staff login.
