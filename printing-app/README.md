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

## 1. Set your real prices

Before you launch, edit **`src/lib/pricing.ts`**. Right now it has
placeholder numbers:

```ts
export const PRICE_PER_PAGE = {
  bw: { single: 0.5, double: 0.4 },
  color: { single: 2, double: 1.8 },
};
```

Each number is the price **per printed side**, before multiplying by the
number of copies. Change `CURRENCY` in the same file if you're not pricing
in CNY. Nothing else in the app needs to change — every price shown to
customers and stored on orders is computed from this one file.

## 2. Local development

```bash
npm install
cp .env.example .env   # then fill in ADMIN_PASSWORD, SESSION_SECRET, DATABASE_URL
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000 for the order form, and
http://localhost:3000/dashboard for the dashboard (log in with the
`ADMIN_PASSWORD` you set).

**Important gotcha with `DATABASE_URL`:** always use an **absolute path**,
e.g. `file:/home/you/printing-app/prisma/dev.db`. A relative path like
`file:./dev.db` gets resolved differently by the Prisma CLI (relative to the
`prisma/` folder) than by the running app (relative to wherever it was
started from) — with a relative path they silently point at two different
files and the app fails with "unable to open the database file".

## 3. Deploying to your VPS (printing.ar9.top)

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

**nginx** (`/etc/nginx/sites-available/printing.ar9.top`):

```nginx
server {
    listen 80;
    server_name printing.ar9.top;

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
sudo ln -s /etc/nginx/sites-available/printing.ar9.top /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d printing.ar9.top
```

`/dashboard` needs no separate setup — it's just a route inside this same
app, so `printing.ar9.top/dashboard` works automatically once the app is
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
