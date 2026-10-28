# Krust Artisan Bakes

Storefront and admin panel for Krust Artisan Bakes: online ordering with Google sign-in, Razorpay payments, GST invoices and receipts, festive hampers, and a role-based admin panel (dev, super and sales admins).

Built with Next.js 16 (App Router) and a SQLite database file.

## Run on your computer

```
npm install
npm run dev
```

Open http://localhost:5173. Admin: http://localhost:5173/admin.

Settings go in `.env.local` (copy `.env.example`). Without `DATABASE_PATH`, the database is `~/krust-data/krust.db` (home folder) in production and `../krust-data/krust.db` in development, so redeploys never replace it.

## Production (Hostinger Node.js web app)

| Setting | Value |
|---|---|
| Framework | Next.js |
| Node.js | 20 or 22 |
| Build command | `npm run build` |
| Start command | `npm start` |
| Output directory | `.next` |

Environment variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, optional `RAZORPAY_WEBHOOK_SECRET` and `DATABASE_PATH`. Keep the database outside the app folder so redeploys never touch it.

## Moving data from Cloudflare D1

```
npx wrangler d1 export krust-db --remote --output live-export.sql
node scripts/import-d1-dump.mjs live-export.sql krust.db
```

Upload `krust.db` to `~/krust-data` on the server while the app is stopped.
