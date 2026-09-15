# Printing order site

Customers upload a PDF or photo, choose single/double-sided and
color/black-and-white, see an instant price, and confirm the order. You get
`/dashboard`: a password-protected list of every order, where you can
download the file and update its status (pending → printing → ready →
completed).

Stack: Next.js (App Router) + Prisma + SQLite + Tailwind + TypeScript.
No external services, no payment gateway — customers pay in person when they
pick up their prints. Everything lives in one SQLite file plus a folder of
uploaded files, so it deploys as a single Node process behind nginx.

## 1. Prices

Set in **`src/lib/pricing.ts`**, from Nayem's printed price list:

```ts
export const PRICE_PER_PAGE = {
  bw: { single: 0.1, double: 0.15 },
  color: { single: 0.2, double: 0.3 },
};
```

Each number is the price **per printed side**, before multiplying by the
number of copies. Change `CURRENCY` in the same file if you ever need a
different currency. Nothing else in the app needs to change — every price
shown to customers and stored on orders is computed from this one file.

**Not yet wired up:** "Picture Print (9 copies) — ¥4" from the price list.
That's a flat-rate photo-sheet product (one photo, 9-up on a sheet), a
different shape than "N pages at a per-page rate" — the order form only
does the latter right now.

## 2. Local development (e.g. on your Mac)

If you don't have Node yet: `brew install node` (or download from
[nodejs.org](https://nodejs.org)). Then, from inside `printing-app/`:

```bash
npm install
npm run setup
npx prisma migrate deploy
npm run dev
```

`npm run setup` writes a working `.env` for you — a correctly-formed
absolute `DATABASE_URL` (see the gotcha below), a random session secret,
and a random dashboard password, which it prints once. It won't touch
`.env` if one already exists, so it's safe to run again.

Open http://localhost:3000 for the order form, and
http://localhost:3000/dashboard for the dashboard (log in with the
password `npm run setup` printed — it's also saved as `ADMIN_PASSWORD` in
`.env` if you scroll back and lose it).

**The `DATABASE_URL` gotcha `npm run setup` exists to avoid:** it must be
an **absolute path**, e.g. `file:/home/you/printing-app/prisma/dev.db`. A
relative path like `file:./dev.db` gets resolved differently by the Prisma
CLI (relative to the `prisma/` folder) than by the running app (relative to
wherever it was started from) — with a relative path they silently point
at two different files and the app fails with "unable to open the
database file". If you ever hand-edit `DATABASE_URL`, keep it absolute.

## 3. Deploying to your VPS (print.arnayem.top)

This assumes the same pm2 + nginx setup you already use for your other
projects.

**On the server:**

```bash
git clone <this-repo-url> printing-app
cd printing-app
npm ci
cp .env.example .env
# edit .env: ADMIN_PASSWORD, SESSION_SECRET (generate with the command
# in .env.example), and DATABASE_URL as an absolute path, e.g.
# file:/home/youruser/printing-app/prisma/prod.db
npx prisma migrate deploy
npm run build
pm2 start npm --name printing-app -- start -- -p 3000
pm2 save
```

**nginx** (`/etc/nginx/sites-available/print.arnayem.top`):

```nginx
server {
    listen 80;
    server_name print.arnayem.top;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 30m; # matches MAX_UPLOAD_BYTES in src/lib/storage.ts
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/print.arnayem.top /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d print.arnayem.top
```

`/dashboard` needs no separate setup — it's just a route inside this same
app, so `print.arnayem.top/dashboard` works automatically once the app is
running.

**Redeploying after code changes:**

```bash
git pull
npm ci
npx prisma migrate deploy   # only does something if the schema changed
npm run build
pm2 restart printing-app
```

## 4. Data you're responsible for backing up

Two things hold real customer data and are **not** in git (see
`.gitignore`):

- The SQLite file at whatever path you set `DATABASE_URL` to.
- The uploaded files folder, `data/uploads/` by default (or wherever
  `UPLOAD_DIR` points, see `.env.example`).

Back both of these up regularly — losing either loses customer orders or
their files.

## 5. How it works, if you want to change something

- `src/lib/pricing.ts` — pricing rules (see above).
- `src/lib/orderStatus.ts` — the status values orders can have.
- `src/app/page.tsx` + `src/app/OrderForm.tsx` — the public order form.
  It's a two-step flow: "Get price" calls `POST /api/orders/quote` (parses
  the PDF/image, computes a price, saves nothing), then "Confirm & place
  order" calls `POST /api/orders` (saves the file + creates the order).
- `src/app/order/[id]/page.tsx` — the confirmation page a customer lands on
  after ordering. Its URL is unguessable (a long random ID) but not
  password-protected, so you can text/share the link with a customer.
- `src/app/dashboard/**` and `src/app/api/dashboard/**` — everything here
  requires the admin password. Enforced in `src/proxy.ts` (Next's
  request-interception layer) and re-checked in every route handler.
- `src/lib/storage.ts` — where uploaded files are saved/read/deleted on
  disk.
- `scripts/setup-dev-env.mjs` — the `npm run setup` script (local dev
  only; the VPS deploy steps above set `.env` by hand on purpose, since a
  production admin password shouldn't be auto-generated and only shown
  once in a terminal you might close).
