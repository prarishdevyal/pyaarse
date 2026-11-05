# Pyaarse — handcrafted candle shop

Next.js 16 app in Docker, with **Supabase** for the database (Postgres), product images (Storage) and logins (Auth),
and **Resend** for order emails. No payment gateway: orders are placed, the customer gets an email,
the team gets a Telegram alert, and payment is collected by sending a UPI QR on WhatsApp.

## Run locally

```bash
cp .env.example .env
# In .env set:
#   DATABASE_URL + SUPABASE_*  from your Supabase project (Connect). Use the Session pooler URI;
#                              if the password contains "$", write it as %24.
#   ADMIN_PASSWORD             at least 12 characters (the example value is refused)
#   RESEND_API_KEY             optional; without it emails go to the local Mailpit inbox
docker compose up --build
```

| What | URL |
|---|---|
| Shop | http://localhost:3000 |
| Admin | http://admin.localhost:3000 (log in with ADMIN_EMAIL / ADMIN_PASSWORD) |
| Test inbox (when Resend isn't set up) | http://localhost:8025 |

On every start the app migrates the Supabase database, creates the `product-images` storage bucket and the admin
user if missing, and adds sample products to an empty catalogue. Every table has Row Level Security on, so the
Supabase Data API exposes nothing; only the app's server reads and writes the data.

**Logins** use Supabase Auth. Customers confirm their email before they can log in. The admin is a Supabase user
with `app_metadata.role = "admin"` (set by the server only). In Supabase → Authentication → URL Configuration, the
redirect URLs must include `http://localhost:3000/**` and `http://admin.localhost:3000/**` (and your real domains later).

**Change the admin password:** set a new `ADMIN_PASSWORD` in `.env`, then
`docker compose up -d app && docker compose exec app npm run admin:password` (signs the admin out everywhere).

**Order emails:** sent with Resend when `RESEND_API_KEY` is set (otherwise via SMTP/Mailpit). Switch customer
confirmation emails on/off in Admin → Settings. Until your domain is verified in Resend, use
`MAIL_FROM=Pyaarse <onboarding@resend.dev>` (Resend then only delivers to your own Resend account email).

**Without Docker for the app** (faster reloads): `docker compose up mailpit`, then `npm install && npm run dev`
(`.env.local` points SMTP at localhost). The dev server only listens on 127.0.0.1.

## Telegram alerts

1. In Telegram, message **@BotFather** → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`.
2. Add the bot to your orders group and send any message in the group.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id` (a negative number) into `TELEGRAM_CHAT_ID`.
4. Restart: `docker compose up -d app`.

If these are empty, the message is printed in the app logs instead.

## Order flow

Pending payment → (send QR on WhatsApp, customer pays) → Paid → Shipped → Delivered.

- Cancelling an order returns its items to stock and can't be undone.
- Unpaid orders are cancelled automatically after `PENDING_ORDER_TTL_HOURS` (default 48), so they stop holding stock.
  Mark an order **Paid** before then.
- A customer can order at most 10 of each item per order. Login, registration and checkout are rate-limited.

## Tests

```bash
npm test
```

## Going live on pyaarse.net

- Point `pyaarse.net` and `admin.pyaarse.net` at the server; any host starting with `admin.` serves the admin panel.
- Put a reverse proxy (e.g. Caddy/Nginx) with HTTPS in front of the app. It must set `X-Forwarded-For` and
  `X-Forwarded-Host` itself (overwriting what clients send), because rate limiting and admin routing use them.
- Set `SITE_URL=https://pyaarse.net`, `ADMIN_URL=https://admin.pyaarse.net`.
- Verify `pyaarse.net` in Resend, set `MAIL_FROM` on that domain, and don't run the `mailpit` service in production.
- In Supabase: add the production redirect URLs, set the Site URL to `https://pyaarse.net`, and connect custom SMTP
  (e.g. Resend) under Authentication → Emails so sign-up confirmations aren't limited to a few per hour.
- Replace the placeholder product photos with real ones from the admin panel.
