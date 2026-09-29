import QRCode from 'qrcode';
import { formatTzs } from './money';
import { formatTicketDate, formatTimeRange } from './ticketFormat';

/**
 * Draws a ticket as a real PNG (not a screenshot of the page and not
 * HTML), so "Download Ticket" gives the buyer an image they can keep in
 * their gallery, forward on WhatsApp or print. Uses only the Canvas 2D API
 * and the `qrcode` package the app already depends on.
 *
 * Laid out at 900x1560 CSS px and rendered at 2x for a sharp result.
 * The QR is drawn at 300px, well above what phone scanners need.
 */
const WIDTH = 900;
const HEIGHT = 1560;
const SCALE = 2;

const COLORS = {
  page: '#eef3fa',
  card: '#ffffff',
  navy: '#12305f', // --color-brand-navy
  navySoft: '#122c42',
  royal: '#1e3399',
  gold: '#c99a45',
  ink: '#050b14',
  muted: '#5b6478',
  line: '#e3e7ef',
  white: '#ffffff',
  whiteSoft: 'rgba(255,255,255,0.72)',
};

const FONT_STACK = "Nunito, 'Segoe UI', Roboto, Arial, sans-serif";
const font = (weight, size) => `${weight} ${size}px ${FONT_STACK}`;

async function ensureFonts() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([document.fonts.load(font(800, 64)), document.fonts.load(font(700, 32)), document.fonts.load(font(600, 22))]);
  } catch {
    // Falls back to system sans-serif. The ticket is still correct, just less on-brand.
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Word-wraps `text` into at most `maxLines` lines, ellipsizing the last one. */
function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = ellipsize(ctx, `${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, maxWidth);
    return kept;
  }
  return lines.map((line) => ellipsize(ctx, line, maxWidth));
}

function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) trimmed = trimmed.slice(0, -1);
  return `${trimmed.trimEnd()}…`;
}

function label(ctx, text, x, y, color = COLORS.muted, align = 'left') {
  ctx.font = font(700, 17);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.letterSpacing = '2px';
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

function value(ctx, text, x, y, { size = 30, weight = 700, color = COLORS.ink, align = 'left', maxWidth } = {}) {
  ctx.font = font(weight, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(maxWidth ? ellipsize(ctx, text, maxWidth) : text, x, y);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function renderTicketImage(ticket) {
  await ensureFonts();

  const qrDataUrl = await QRCode.toDataURL(ticket.qrPayload, {
    width: 600,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: COLORS.navy, light: COLORS.white },
  });
  const qrImage = await loadImage(qrDataUrl);

  const pad = 56;
  const contentWidth = WIDTH - 100 - pad * 2;

  // The header grows with the title (1–3 lines), so a short title leaves no empty band.
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font(800, 60);
  const titleLineCount = wrapLines(measure, ticket.event.title.toUpperCase(), contentWidth, 3).length;
  const headerH = 350 + (titleLineCount - 1) * 68;
  const height = HEIGHT - (470 - headerH) + 10;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLORS.page;
  ctx.fillRect(0, 0, WIDTH, height);

  const cardX = 50;
  const cardY = 50;
  const cardW = WIDTH - 100;
  const cardH = height - 100;
  const left = cardX + pad;
  const right = cardX + cardW - pad;
  const contentW = cardW - pad * 2;

  // Card with a soft shadow.
  ctx.save();
  ctx.shadowColor = 'rgba(8, 24, 39, 0.16)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, cardX, cardY, cardW, cardH, 10);
  ctx.fillStyle = COLORS.card;
  ctx.fill();
  ctx.restore();

  // Navy header, clipped to the card's rounded top.
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 10);
  ctx.clip();
  ctx.fillStyle = COLORS.navy;
  ctx.fillRect(cardX, cardY, cardW, headerH);
  // A single restrained accent: thin royal band + gold rule.
  ctx.fillStyle = COLORS.royal;
  ctx.fillRect(cardX, cardY, cardW, 8);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(left, cardY + headerH - 150, 64, 3);
  ctx.restore();

  label(ctx, 'CardHub', left, cardY + 74, COLORS.gold);
  label(ctx, ticket.isDemo ? 'Demo ticket' : 'Event ticket', right, cardY + 74, COLORS.whiteSoft, 'right');

  ctx.font = font(800, 60);
  const titleLines = wrapLines(ctx, ticket.event.title.toUpperCase(), contentW, 3);
  titleLines.forEach((line, index) => value(ctx, line, left, cardY + 160 + index * 68, { size: 60, weight: 800, color: COLORS.white }));

  const dateText = formatTicketDate(ticket.event.date).toUpperCase();
  value(ctx, dateText, left, cardY + headerH - 90, { size: 28, weight: 800, color: COLORS.white, maxWidth: contentW });
  value(ctx, (ticket.event.venue?.name || '').toUpperCase(), left, cardY + headerH - 48, {
    size: 24,
    weight: 700,
    color: COLORS.whiteSoft,
    maxWidth: contentW,
  });

  // Perforation: two notches + dashed tear line.
  const tearY = cardY + headerH;
  ctx.fillStyle = COLORS.page;
  [cardX, cardX + cardW].forEach((cx) => {
    ctx.beginPath();
    ctx.arc(cx, tearY, 24, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.save();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(cardX + 36, tearY);
  ctx.lineTo(cardX + cardW - 36, tearY);
  ctx.stroke();
  ctx.restore();

  // Ticket type + price.
  let cursor = tearY + 70;
  label(ctx, 'Ticket type', left, cursor);
  label(ctx, 'Amount paid', right, cursor, COLORS.muted, 'right');
  cursor += 52;
  value(ctx, ticket.ticketType.name.toUpperCase(), left, cursor, { size: 46, weight: 800, color: COLORS.royal, maxWidth: contentW * 0.55 });
  value(ctx, formatTzs(ticket.pricePaidTzs), right, cursor, { size: 32, weight: 800, align: 'right' });

  const rule = (y) => {
    ctx.fillStyle = COLORS.line;
    ctx.fillRect(left, y, contentW, 2);
  };
  cursor += 36;
  rule(cursor);

  // Holder.
  cursor += 52;
  label(ctx, 'Ticket holder', left, cursor);
  cursor += 44;
  value(ctx, ticket.holderName.toUpperCase(), left, cursor, { size: 34, weight: 800, maxWidth: contentW });
  cursor += 38;
  value(ctx, ticket.holderPhone || '', left, cursor, { size: 24, weight: 600, color: COLORS.muted });
  cursor += 34;
  rule(cursor);

  // Date / time / venue.
  cursor += 52;
  const colW = contentW / 2;
  label(ctx, 'Date', left, cursor);
  label(ctx, 'Time', left + colW, cursor);
  cursor += 40;
  value(ctx, formatTicketDate(ticket.event.date, { weekday: true, short: true }), left, cursor, { size: 26, maxWidth: colW - 16 });
  value(ctx, formatTimeRange(ticket.event.startTime, ticket.event.endTime) || '—', left + colW, cursor, { size: 26, maxWidth: colW });
  cursor += 52;
  label(ctx, 'Venue', left, cursor);
  cursor += 40;
  const venueText = [ticket.event.venue?.name, ticket.event.venue?.address].filter(Boolean).join(', ');
  value(ctx, venueText || '—', left, cursor, { size: 26, maxWidth: contentW });

  // QR, centred with a hairline frame.
  const qrSize = 300;
  const qrX = cardX + (cardW - qrSize) / 2;
  const qrY = cursor + 44;
  roundRect(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 8);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  ctx.imageSmoothingEnabled = true;

  // Ticket ID.
  const idY = qrY + qrSize + 78;
  label(ctx, 'Ticket ID', WIDTH / 2, idY - 34, COLORS.muted, 'center');
  ctx.letterSpacing = '3px';
  value(ctx, ticket.ticketId, WIDTH / 2, idY + 8, { size: 36, weight: 800, align: 'center' });
  ctx.letterSpacing = '0px';
  value(ctx, ticket.isDemo ? 'Demo ticket · no payment was taken' : 'Scan at the entrance · cardhub.co.tz', WIDTH / 2, idY + 46, {
    size: 20,
    weight: 600,
    color: COLORS.muted,
    align: 'center',
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not render ticket'))), 'image/png');
  });
}
