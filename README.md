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

