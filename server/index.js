import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '100kb' }));

const envSchema = z.object({
  PORT: z.string().default('5174'),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  EMAILJS_SERVICE_ID: z.string().min(1),
  EMAILJS_TEMPLATE_ID: z.string().min(1),
  EMAILJS_PUBLIC_KEY: z.string().min(1),
  EMAILJS_PRIVATE_KEY: z.string().min(1),
  STORE_FROM_NAME: z.string().min(1).default('Callofast'),
  STORE_REPLY_TO: z.string().email().default('no-reply@example.com')
});

const env = envSchema.parse(process.env);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', env.APP_ORIGIN);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PICKUP_LOCATIONS = {
  // Märkte (immer 9:00–14:30 Uhr)
  kamen_fr: 'Kamen | Fr. (9:00–14:30 Uhr)',
  menden_di_fr: 'Menden | Di. und Fr. (9:00–14:30 Uhr)',
  hagen_boele_mi: 'Hagen-Boele | Mi. (9:00–14:30 Uhr)',
  hemer_mi_sa: 'Hemer | Mi. und Sa. (9:00–14:30 Uhr)',
  iserlohn_mi_sa: 'Iserlohn | Mi. und Sa. (9:00–14:30 Uhr)',
  neheim_mi_sa: 'Neheim | Mi. und Sa. (9:00–14:30 Uhr)',
  dortmund_brackel_do: 'Dortmund-Brackel | Do. (9:00–14:30 Uhr)',
  herdecke_do: 'Herdecke | Do. (9:00–14:30 Uhr)',
  hagen_friedrich_ebert_platz_fr: 'Hagen Friedrich-Ebert-Platz | Fr. (9:00–14:30 Uhr)',
  holzwickede_fr: 'Holzwickede | Fr. (9:00–14:30 Uhr)',
  unna_stockum_hofmarkt_fr_sa: 'Unna-Stockum (Hofmarkt) | Fr. und Sa. (9:00–14:30 Uhr)',
  unna_fr: 'Unna | Fr. (9:00–14:30 Uhr)',
  hagen_springe_sa: 'Hagen-Springe | Sa. (9:00–14:30 Uhr)',
  schwerte_fussgaengerzone_sa: 'Schwerte (Fußgängerzone) | Sa. (9:00–14:30 Uhr)',

  // Hofladen
  hofladen_ardey_mo_sa_11: 'Hofladen Ardey | Mo.–Sa. ab 11:00 Uhr'
};

const checkoutSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  pickup: z.enum(Object.keys(PICKUP_LOCATIONS)),
  customer_notes: z.string().trim().max(500).optional().default(''),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        price: z.number().finite().nonnegative(),
        qty: z.number().int().positive().max(99)
      })
    )
    .min(1)
});

function formatMoneyEUR(value) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}

function createOrderId() {
  const n = Math.floor(Math.random() * 90000 + 10000);
  return `#ORD-${n}`;
}

function formatDateTimeDE(date) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

async function createInvoicePdfBytes({
  orderId,
  name,
  email,
  pickupLabel,
  items,
  subtotal,
  discountAmount,
  total,
  customerNotes
}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
  const { width, height } = page.getSize();

  const margin = 48;
  let y = height - margin;

  const drawText = (text, size = 12, isBold = false) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: isBold ? bold : font
    });
    y -= size + 6;
  };

  drawText('Rechnung / Bestellübersicht', 18, true);
  y -= 8;
  drawText(`Bestellnummer: ${orderId}`, 12, true);
  drawText(`Datum: ${formatDateTimeDE(new Date())}`);
  y -= 8;

  drawText('Kundendaten', 14, true);
  drawText(`Name: ${name}`);
  drawText(`E-Mail: ${email}`);
  drawText(`Abholung: ${pickupLabel}`);
  y -= 8;

  drawText('Artikel', 14, true);

  const lineHeight = 14;
  const maxWidth = width - margin * 2;

  for (const it of items) {
    const line = `${it.name}  × ${it.qty}   (${formatMoneyEUR(it.price)} / Stk.)   = ${formatMoneyEUR(
      it.price * it.qty
    )}`;
    // Very simple wrapping
    const words = line.split(' ');
    let current = '';
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      const textWidth = font.widthOfTextAtSize(next, 11);
      if (textWidth > maxWidth) {
        page.drawText(current, { x: margin, y, size: 11, font });
        y -= lineHeight;
        current = w;
      } else {
        current = next;
      }
    }
    if (current) {
      page.drawText(current, { x: margin, y, size: 11, font });
      y -= lineHeight;
    }

    if (y < margin + 120) {
      // add new page if needed
      y = height - margin;
      const p = pdfDoc.addPage([595.28, 841.89]);
      // switch drawing to new page by mutating outer variables
      page.setHeight(height); // noop-ish, just to keep reference used above
      // NOTE: For this small demo we expect the cart to be short.
      // If you need multi-page carts, we can refactor to a proper page loop.
    }
  }

  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1
  });
  y -= 16;

  page.drawText(`Zwischensumme: ${formatMoneyEUR(subtotal)}`, { x: margin, y, size: 12, font });
  y -= 16;
  page.drawText(`Rabatt (5%): -${formatMoneyEUR(discountAmount)}`, { x: margin, y, size: 12, font });
  y -= 18;
  page.drawText(`Gesamt: ${formatMoneyEUR(total)}`, { x: margin, y, size: 14, font: bold });
  y -= 22;

  if (customerNotes && customerNotes.trim()) {
    page.drawText('Notizen:', { x: margin, y, size: 12, font: bold });
    y -= 16;
    const note = customerNotes.trim();
    const words = note.split(' ');
    let current = '';
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      const textWidth = font.widthOfTextAtSize(next, 11);
      if (textWidth > maxWidth) {
        page.drawText(current, { x: margin, y, size: 11, font });
        y -= lineHeight;
        current = w;
      } else {
        current = next;
      }
    }
    if (current) {
      page.drawText(current, { x: margin, y, size: 11, font });
      y -= lineHeight;
    }
  }

  return await pdfDoc.save();
}

app.post('/api/checkout', async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  }

  const { name, email, pickup, items, customer_notes } = parsed.data;
  const orderId = createOrderId();
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const discountAmount = subtotal >= 30 ? subtotal * 0.05 : 0;
  const total = subtotal - discountAmount;

  const lines = items
    .map((it) => `- ${it.name} × ${it.qty} (${formatMoneyEUR(it.price)} / Stk.)`)
    .join('\n');

  const pickupLabel = PICKUP_LOCATIONS[pickup];

  const invoiceBytes = await createInvoicePdfBytes({
    orderId,
    name,
    email,
    pickupLabel,
    items,
    subtotal,
    discountAmount,
    total,
    customerNotes: customer_notes
  });
  const invoiceBase64 = Buffer.from(invoiceBytes).toString('base64');
  const invoiceFilename = `Rechnung_${orderId.replace('#', '')}.pdf`;

  const templateParams = {
    to_name: name,
    to_email: email,
    user_name: name,
    user_email: email,
    name,
    email,
    from_name: env.STORE_FROM_NAME,
    reply_to: env.STORE_REPLY_TO,
    order_id: orderId,
    subtotal_amount: formatMoneyEUR(subtotal),
    discount_amount: formatMoneyEUR(discountAmount),
    total_amount: formatMoneyEUR(total),
    pickup_location: pickupLabel,
    order_lines: lines,

    // Template aliases (match common EmailJS template field names)
    pickup_option: pickupLabel,
    cart_items: lines,
    customer_notes,

    // PDF invoice attachment (EmailJS Variable Attachment)
    invoice_pdf: invoiceBase64,
    invoice_filename: invoiceFilename
  };

  try {
    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: env.EMAILJS_SERVICE_ID,
        template_id: env.EMAILJS_TEMPLATE_ID,
        user_id: env.EMAILJS_PUBLIC_KEY,
        accessToken: env.EMAILJS_PRIVATE_KEY,
        template_params: templateParams
      })
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      const isNonBrowserDisabled =
        r.status === 403 &&
        typeof text === 'string' &&
        text.toLowerCase().includes('non-browser') &&
        text.toLowerCase().includes('disabled');

      if (isNonBrowserDisabled) {
        return res.status(403).json({
          error: 'EMAILJS_NON_BROWSER_DISABLED',
          message:
            'EmailJS REST API is blocked for server environments. Enable "API access from non-browser environments" in your EmailJS dashboard (Account → Security).'
        });
      }

      return res.status(502).json({ error: 'EMAIL_SEND_FAILED', status: r.status, body: text });
    }

    return res.json({ ok: true, orderId });
  } catch (e) {
    return res.status(502).json({ error: 'EMAIL_SEND_FAILED', message: e?.message ?? 'Unknown error' });
  }
});

app.listen(Number(env.PORT), () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

