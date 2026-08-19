/**
 * Dynamic SMS/WhatsApp message builders for the delivery pipeline
 * (delivery.service.js). CardHub is not wedding-only, so every string
 * here is assembled from the order's own event fields — nothing about a
 * specific couple, venue, or date is ever hardcoded. An order with a
 * missing optional field (venue, date, time) degrades gracefully by
 * omitting that clause rather than printing "undefined"/"null".
 */

const SW_EVENT_LABEL = {
  wedding: 'HARUSI',
  birthday: 'SIKUKUU YA KUZALIWA',
  graduation: 'MAHAFALI',
  anniversary: 'MAADHIMISHO',
  send_off: 'HARAMBEE YA KUAGA',
  baby_shower: 'BABY SHOWER',
  party: 'PETI',
  corporate: 'TUKIO LA KAMPUNI',
  other: 'TUKIO',
};

const EVENT_ICON = {
  wedding: '\u{1F48D}', // 💍
  birthday: '\u{1F382}', // 🎂
  graduation: '\u{1F393}', // 🎓
  anniversary: '\u{1F495}', // 💕
  send_off: '✈️', // ✈️
  baby_shower: '\u{1F476}', // 👶
  party: '\u{1F389}', // 🎉
  corporate: '\u{1F4BC}', // 💼
  other: '\u{1F38A}', // 🎊
};

const SW_EVENT_LOWER = {
  wedding: 'harusi',
  birthday: 'sikukuu ya kuzaliwa',
  graduation: 'mahafali',
  anniversary: 'maadhimisho',
  send_off: 'harambee ya kuaga',
  baby_shower: 'baby shower',
  party: 'peti',
  corporate: 'tukio la kampuni',
  other: 'tukio',
};

/** "2026-07-30" -> "30/07/2026", for the SMS's Swahili date style. */
function formatDateSlash(dateValue) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-07-30" -> "30 July 2026", for the WhatsApp message's plain date style. */
function formatDateLong(dateValue) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * "18:00" -> "saa 12 Jioni" (Swahili clock time is offset 6 hours from
 * EAT, e.g. 6pm EAT = "saa 12 jioni"). Period boundaries follow the
 * common East African convention: Usiku (night) 19:00-04:59, Asubuhi
 * (morning) 05:00-11:59, Mchana (afternoon) 12:00-15:59, Jioni (evening)
 * 16:00-18:59.
 */
function formatTimeSwahili(timeValue) {
  if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) return null;
  const eatHour = Number(timeValue.slice(0, 2));
  const swahiliHour = ((eatHour - 6 + 12) % 12) || 12;

  let period;
  if (eatHour >= 16 && eatHour <= 18) period = 'Jioni';
  else if (eatHour >= 12) period = 'Mchana';
  else if (eatHour >= 5) period = 'Asubuhi';
  else period = 'Usiku';

  return `saa ${swahiliHour} ${period}`;
}

/** "09:00" -> "09:00 AM", for the WhatsApp message's plain time style. */
function formatTimePlain(timeValue) {
  if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) return null;
  const [h, m] = timeValue.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function guestTypeSuffix(guestType) {
  if (guestType === 'single') return '-Single';
  if (guestType === 'double') return '-Double';
  return '';
}

/**
 * Builds the Swahili SMS invitation text. `order` fields are already
 * resolved/trusted server-side (see orders.service.js) — nothing here is
 * client-supplied at send time.
 */
export function buildInvitationSms({ guestName, eventType, eventName, venue, eventDate, eventTime, invitationNumber, guestType }) {
  const firstName = guestName ? guestName.trim().split(/\s+/)[0] : '';
  const label = SW_EVENT_LOWER[eventType] || SW_EVENT_LOWER.other;
  const dateStr = formatDateSlash(eventDate);
  const timeStr = formatTimeSwahili(eventTime);

  const whenWhere = [];
  if (eventName) whenWhere.push(`katika ${eventName}`);
  else whenWhere.push(`katika ${label}`);
  if (venue) whenWhere.push(`itakayofanyika ${venue}`);
  if (dateStr) whenWhere.push(`siku ya ${dateStr}`);
  if (timeStr) whenWhere.push(`kuanzia ${timeStr}`);

  const lines = [
    `Habari ${firstName || guestName || ''}.`,
    '',
    `Tunapenda kuchukua nafasi hii kukualika ${whenWhere.join(', ')}.`,
    '',
    `Mualiko namba #${invitationNumber}${guestTypeSuffix(guestType)}`,
    '',
    'Tafadhali fika na meseji hii.',
    '',
    'Karibu sana',
  ];

  return lines.join('\n');
}

/**
 * Builds the WhatsApp invitation caption, including the real public
 * invitation URL (never a client-supplied one — see publicUrl.js).
 */
export function buildInvitationWhatsapp({ guestName, eventType, eventName, venue, eventDate, eventTime, publicUrl }) {
  const firstName = guestName ? guestName.trim().split(/\s+/)[0] : '';
  const icon = EVENT_ICON[eventType] || EVENT_ICON.other;
  const label = SW_EVENT_LABEL[eventType] || SW_EVENT_LABEL.other;
  const heading = eventName ? `${label} YA ${eventName.toUpperCase()}` : label;

  const dateStr = formatDateLong(eventDate);
  const timeStr = formatTimePlain(eventTime);

  const detailLines = [];
  if (dateStr) detailLines.push(`\u{1F4C5} ${dateStr}`); // 📅
  if (timeStr) detailLines.push(`\u{1F552} ${timeStr}`); // 🕒
  if (venue) detailLines.push(`\u{1F4CD} ${venue}`); // 📍

  const lines = [
    `Habari ${firstName || guestName || ''},`,
    '',
    'Tunafurahi kukualika kuhudhuria:',
    `${icon} ${heading}`,
    '',
    ...detailLines,
    '',
    'Fungua link hapa chini kuona mwaliko wako rasmi, QR Code ya kuingilia na kuthibitisha uwepo wako:',
    '',
    publicUrl,
    '',
    'Karibu sana.',
  ];

  return lines.join('\n');
}
