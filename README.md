# Callofast Shop

Clean, minimal webshop demo:
- Frontend: Vite (static HTML/JS)
- Backend: Node.js + Express API for checkout
- Emails: EmailJS REST API (keys stay in server `.env`)

## Why this is “clean + protected”

- **No secrets in the browser**: EmailJS private key is only on the server.
- **Input validation**: backend validates checkout payload with `zod`.
- **Simple architecture**: `web/` (UI) and `server/` (API).

## Setup (Windows / PowerShell)

Open a terminal in this folder (`callofast-shop/`) and run:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and set:
- `EMAILJS_PUBLIC_KEY`
- `EMAILJS_PRIVATE_KEY`
- (optionally) `STORE_REPLY_TO`

## Run locally

```powershell
npm run dev
```

Open:
- Frontend: `http://localhost:5173`
- API health: `http://localhost:5174/api/health`

## Publish frontend + backend (public)

Recommended setup:
- Backend on **Render** (Web Service)
- Frontend on **Netlify** (static site)

### 1) Deploy backend (Render)

1. Push this repository to GitHub.
2. In Render: **New +** → **Web Service** → connect your GitHub repo.
3. Configure:
   - **Build command**: `npm install`
   - **Start command**: `npm run dev:server`
4. Add environment variables in Render:
   - `PORT=10000` (Render injects a port, keep this value or map to `$PORT` in Render UI)
   - `APP_ORIGIN=https://YOUR_FRONTEND_DOMAIN`
   - `EMAILJS_SERVICE_ID=...`
   - `EMAILJS_TEMPLATE_ID=...`
   - `EMAILJS_PUBLIC_KEY=...`
   - `EMAILJS_PRIVATE_KEY=...`
   - `STORE_FROM_NAME=Callofast (Samira Kuklinski)`
   - `STORE_REPLY_TO=you@example.com`
5. Deploy and test:
   - `https://YOUR_BACKEND_DOMAIN/api/health` should return `{ "ok": true }`.

### 2) Deploy frontend (Netlify)

1. In Netlify: **Add new site** → import the same GitHub repo.
2. Build settings:
   - **Build command**: `npm run build:web`
   - **Publish directory**: `web/dist`
3. Add environment variable:
   - `VITE_API_BASE_URL=https://YOUR_BACKEND_DOMAIN`
4. Deploy the site.

### 3) Connect frontend to backend

After frontend deploy:
1. Copy your Netlify URL.
2. Update backend env `APP_ORIGIN` in Render to that URL.
3. Redeploy backend.

Now your checkout requests go to:
- `${VITE_API_BASE_URL}/api/checkout` in production
- `/api/checkout` in local dev (via Vite proxy)

## Notes

- Your EmailJS template should accept these variables (template params):
  - `to_name`, `to_email`, `from_name`, `reply_to`
  - `order_id`, `total_amount`, `pickup_location`, `order_lines`

## PDF invoice attachment (EmailJS)

This project generates a **PDF invoice** on the server and sends it as an EmailJS attachment.

In your EmailJS template editor:
- Go to **Attachments** tab
- Add **Dynamic attachment** → **Variable Attachment**
- Set:
  - **Content type**: `PDF`
  - **Parameter name**: `invoice_pdf`
  - **Filename**: `{{invoice_filename}}` (or a fixed name like `Rechnung.pdf`)

The backend sends:
- `invoice_pdf`: base64 PDF content (no `data:` prefix)
- `invoice_filename`: suggested filename

