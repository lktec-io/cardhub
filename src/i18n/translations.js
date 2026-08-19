/**
 * EN/SW string dictionary for the areas this hardening pass covers:
 * navigation, the catalogue (filters/search/cards), Try Our Service (all
 * steps, including the new event-details/guest-type fields), the public
 * order-card/RSVP page, and admin orders. Other marketing pages (About,
 * FAQ, Terms, etc.) are out of this pass's scope and stay English-only —
 * translating the whole site is a separate content project.
 *
 * Flat key -> { en, sw }. See context/LanguageContext.jsx for the `t()`
 * function this backs; `useLanguage()` already exposes it everywhere the
 * language toggle itself is exposed.
 */
export const TRANSLATIONS = {
  // Navbar
  'nav.home': { en: 'Home', sw: 'Nyumbani' },
  'nav.templates': { en: 'Templates', sw: 'Kadi' },
  'nav.pricing': { en: 'Pricing', sw: 'Bei' },
  'nav.howItWorks': { en: 'How It Works', sw: 'Jinsi Inavyofanya Kazi' },
  'nav.about': { en: 'About', sw: 'Kuhusu' },
  'nav.faq': { en: 'FAQ', sw: 'Maswali' },
  'nav.login': { en: 'Log in', sw: 'Ingia' },
  'nav.goToDashboard': { en: 'Go to dashboard', sw: 'Nenda Dashibodi' },
  'nav.createYourCard': { en: 'Create Your Card', sw: 'Tengeneza Kadi Yako' },

  // Catalogue
  'catalogue.eyebrow': { en: 'Card Catalogue', sw: 'Orodha ya Kadi' },
  'catalogue.title': { en: 'A card for every celebration', sw: 'Kadi kwa kila sherehe' },
  'catalogue.description': {
    en: "Browse CardHub's digital card catalogue, priced per card. Preview a design, then try the service or build a full invitation.",
    sw: 'Vinjari orodha ya kadi za kidijitali za CardHub, bei kwa kila kadi. Angalia mfano, kisha jaribu huduma au tengeneza mwaliko kamili.',
  },
  'catalogue.searchPlaceholder': { en: 'Search templates...', sw: 'Tafuta kadi...' },
  'catalogue.categoryAll': { en: 'All', sw: 'Zote' },
  'catalogue.loadFailedTitle': { en: "Couldn't load templates", sw: 'Imeshindikana kupakia kadi' },
  'catalogue.loadFailedDescription': {
    en: 'Something went wrong while loading the catalog. Please try again.',
    sw: 'Hitilafu imetokea wakati wa kupakia orodha. Tafadhali jaribu tena.',
  },
  'catalogue.retry': { en: 'Retry', sw: 'Jaribu Tena' },
  'catalogue.refreshWarning': {
    en: "Couldn't refresh the list just now — showing the cards we already loaded.",
    sw: 'Imeshindikana kusasisha orodha kwa sasa — tunaonyesha kadi tulizopakia tayari.',
  },
  'catalogue.empty': { en: 'No templates found', sw: 'Hakuna kadi zilizopatikana' },
  'catalogue.emptyDescription': {
    en: 'Try a different search term or category.',
    sw: 'Jaribu neno lingine la utafutaji au kundi lingine.',
  },
  'catalogue.preview': { en: 'Preview', sw: 'Onyesho' },
  'catalogue.select': { en: 'Select', sw: 'Chagua' },
  'catalogue.selected': { en: 'Selected', sw: 'Imechaguliwa' },
  'catalogue.useThisCard': { en: 'Use This Card', sw: 'Tumia Kadi Hii' },
  'catalogue.buildFullInvitation': { en: 'Build full invitation', sw: 'Tengeneza Mwaliko Kamili' },
  'catalogue.close': { en: 'Close', sw: 'Funga' },

  // Template/event categories
  'category.wedding': { en: 'Wedding', sw: 'Harusi' },
  'category.birthday': { en: 'Birthday', sw: 'Siku ya Kuzaliwa' },
  'category.graduation': { en: 'Graduation', sw: 'Mahafali' },
  'category.anniversary': { en: 'Anniversary', sw: 'Maadhimisho' },
  'category.send_off': { en: 'Send Off', sw: 'Harambee ya Kuaga' },
  'category.baby_shower': { en: 'Baby Shower', sw: 'Baby Shower' },
  'category.party': { en: 'Party', sw: 'Peti' },
  'category.corporate': { en: 'Corporate', sw: 'Kampuni' },
  'category.other': { en: 'Other', sw: 'Nyingine' },

  // Try Our Service — steps
  'try.eyebrow': { en: 'Try Our Service', sw: 'Jaribu Huduma Yetu' },
  'try.title': { en: 'Try Our Service', sw: 'Jaribu Huduma Yetu' },
  'try.description': { en: 'A few quick steps — no account needed.', sw: 'Hatua chache tu — hauitaji akaunti.' },
  'try.step.name': { en: 'Your name', sw: 'Jina lako' },
  'try.step.phone': { en: 'Your phone', sw: 'Namba yako' },
  'try.step.card': { en: 'Choose a card', sw: 'Chagua kadi' },
  'try.step.event': { en: 'Event details', sw: 'Taarifa za tukio' },
  'try.step.preview': { en: 'Preview', sw: 'Onyesho' },
  'try.step.send': { en: 'Send', sw: 'Tuma' },
  'try.nameQuestion': { en: "What's your full name?", sw: 'Jina lako kamili ni nani?' },
  'try.nameLabel': { en: 'Full name', sw: 'Jina kamili' },
  'try.nameError': { en: 'Please enter your full name', sw: 'Tafadhali weka jina lako kamili' },
  'try.phoneQuestion': { en: "What's your phone number?", sw: 'Namba yako ya simu ni ipi?' },
  'try.phoneLabel': { en: 'Phone number', sw: 'Namba ya simu' },
  'try.phoneError': { en: 'Please enter a valid phone number', sw: 'Tafadhali weka namba sahihi ya simu' },
  'try.chooseCard': { en: 'Choose a card', sw: 'Chagua kadi' },
  'try.chooseCardError': { en: 'Please choose a card', sw: 'Tafadhali chagua kadi' },
  'try.eventQuestion': { en: 'Tell us about the event', sw: 'Tueleze kuhusu tukio' },
  'try.eventType': { en: 'Event type', sw: 'Aina ya tukio' },
  'try.eventTypeError': { en: 'Please choose an event type', sw: 'Tafadhali chagua aina ya tukio' },
  'try.eventName': { en: 'Event name / title', sw: 'Jina la tukio' },
  'try.eventNamePlaceholder': { en: 'e.g. Leonard & Mary', sw: 'mfano: Leonard & Mary' },
  'try.eventNameError': { en: 'Please enter an event name', sw: 'Tafadhali weka jina la tukio' },
  'try.venue': { en: 'Venue (optional)', sw: 'Mahali (si lazima)' },
  'try.venuePlaceholder': { en: 'e.g. Mlimani City', sw: 'mfano: Mlimani City' },
  'try.eventDate': { en: 'Event date (optional)', sw: 'Tarehe ya tukio (si lazima)' },
  'try.eventTime': { en: 'Event time (optional)', sw: 'Muda wa tukio (si lazima)' },
  'try.guestType': { en: 'Guest type (optional)', sw: 'Aina ya mgeni (si lazima)' },
  'try.guestType.single': { en: 'Single', sw: 'Mmoja' },
  'try.guestType.double': { en: 'Double', sw: 'Wawili' },
  'try.previewTitle': { en: 'Preview', sw: 'Onyesho' },
  'try.readyToSend': { en: 'Ready to send?', sw: 'Tayari kutuma?' },
  'try.summary.name': { en: 'Name', sw: 'Jina' },
  'try.summary.phone': { en: 'Phone', sw: 'Namba' },
  'try.summary.card': { en: 'Card', sw: 'Kadi' },
  'try.summary.price': { en: 'Price', sw: 'Bei' },
  'try.summary.event': { en: 'Event', sw: 'Tukio' },
  'try.sendVia': { en: 'Send my card via', sw: 'Tuma kadi yangu kupitia' },
  'try.channelError': { en: 'Choose at least one delivery method', sw: 'Chagua njia moja ya utumaji angalau' },
  'try.deliveryNote': {
    en: "We'll try to send your card automatically through the methods you choose above. If a provider isn't connected or can't be reached, your request is still saved and our team can follow up — we never claim a message was delivered when it wasn't.",
    sw: 'Tutajaribu kutuma kadi yako moja kwa moja kupitia njia ulizochagua hapo juu. Endapo huduma haijaunganishwa au haifikiki, ombi lako bado limehifadhiwa na timu yetu inaweza kufuatilia — hatuwahi kudai ujumbe umefika ikiwa haujafika.',
  },
  'try.back': { en: 'Back', sw: 'Rudi' },
  'try.next': { en: 'Next', sw: 'Endelea' },
  'try.sendRequest': { en: 'Send my request', sw: 'Tuma ombi langu' },
  'try.genericError': {
    en: "Something went wrong — we couldn't save your request. Please try again.",
    sw: 'Hitilafu imetokea — tumeshindwa kuhifadhi ombi lako. Tafadhali jaribu tena.',
  },
  'try.successHeading': { en: "your request is saved", sw: 'ombi lako limehifadhiwa' },
  'try.successThanks': { en: 'Thanks', sw: 'Asante' },
  'try.invitationNumber': { en: 'Invitation number', sw: 'Namba ya mualiko' },
  'try.yourCardLink': { en: 'You can also view your card directly:', sw: 'Unaweza pia kuona kadi yako moja kwa moja:' },
  'try.deliveryHonestyNote': {
    en: '"Queued"/"sent" means the provider accepted your card for delivery — we never mark a channel as successful unless it actually was.',
    sw: '"Imepokelewa"/"Imetumwa" ina maana huduma imekubali kutuma kadi yako — hatuwahi kuonyesha njia kama imefanikiwa isipokuwa imefanikiwa kweli.',
  },
  'try.browseMore': { en: 'Browse more cards', sw: 'Vinjari kadi zaidi' },
  'try.createAccount': { en: 'Create a full account', sw: 'Fungua akaunti kamili' },

  // Channels
  'channel.whatsapp': { en: 'WhatsApp', sw: 'WhatsApp' },
  'channel.sms': { en: 'SMS', sw: 'SMS' },

  // Channel/order status labels
  'status.not_requested': { en: 'Not requested', sw: 'Haikuombwa' },
  'status.queued': { en: 'Queued', sw: 'Imepokelewa' },
  'status.sent': { en: 'Sent', sw: 'Imetumwa' },
  'status.failed': { en: 'Failed', sw: 'Imeshindwa' },
  'status.unavailable': { en: 'Unavailable', sw: 'Haipatikani' },
  'status.pending': { en: 'Pending', sw: 'Inasubiri' },
  'status.processing': { en: 'Processing', sw: 'Inashughulikiwa' },
  'status.partially_sent': { en: 'Partially sent', sw: 'Imetumwa kwa sehemu' },
  'status.completed': { en: 'Completed', sw: 'Imekamilika' },
  'status.cancelled': { en: 'Cancelled', sw: 'Imeghairiwa' },
  'status.unpaid': { en: 'Unpaid', sw: 'Haijalipwa' },
  'status.paid': { en: 'Paid', sw: 'Imelipwa' },
  'status.attending': { en: 'Attending', sw: 'Nitahudhuria' },
  'status.declined': { en: 'Not attending', sw: 'Sitahudhuria' },

  // Order-card / RSVP page
  'card.loading': { en: 'Loading your card…', sw: 'Inapakia kadi yako…' },
  'card.notFoundTitle': { en: 'Card not found', sw: 'Kadi haijapatikana' },
  'card.notFoundDescription': {
    en: "This link doesn't exist, or is no longer available.",
    sw: 'Kiungo hiki hakipo, au hakipatikani tena.',
  },
  'card.browseCatalogue': { en: 'Browse the catalogue', sw: 'Vinjari orodha ya kadi' },
  'card.heading': { en: "here's your card", sw: 'hii ndiyo kadi yako' },
  'card.hereIsYourCard': { en: "Here's your card", sw: 'Hii ndiyo kadi yako' },
  'card.orderLabel': { en: 'Order', sw: 'Oda' },
  'card.paymentLabel': { en: 'Payment', sw: 'Malipo' },
  'card.placed': { en: 'Placed', sw: 'Imewekwa tarehe' },
  'card.invitationNumber': { en: 'Invitation No.', sw: 'Namba ya Mualiko' },
  'card.venue': { en: 'Venue', sw: 'Mahali' },
  'card.date': { en: 'Date', sw: 'Tarehe' },
  'card.time': { en: 'Time', sw: 'Muda' },
  'card.guestType': { en: 'Guest type', sw: 'Aina ya mgeni' },
  'card.rsvpQuestion': { en: 'Will you be attending?', sw: 'Je, utahudhuria?' },
  'card.rsvpAttending': { en: "I'll be there", sw: 'Nitahudhuria' },
  'card.rsvpDeclined': { en: "Can't make it", sw: 'Sitaweza kuhudhuria' },
  'card.rsvpThanksAttending': {
    en: "Thank you — we can't wait to celebrate with you!",
    sw: 'Asante — hatuwezi kusubiri kusherehekea nawe!',
  },
  'card.rsvpThanksDeclined': { en: 'Thank you for letting us know.', sw: 'Asante kwa kutujulisha.' },
  'card.rsvpAlready': { en: 'Your response has been recorded.', sw: 'Jibu lako limehifadhiwa.' },
  'card.qrHint': {
    en: 'Show this QR code at the door to confirm your attendance.',
    sw: 'Onyesha QR Code hii mlangoni kuthibitisha uwepo wako.',
  },
  'card.createAccount': { en: 'Create a full account', sw: 'Fungua akaunti kamili' },

  // Admin orders
  'admin.orders.title': { en: 'Orders', sw: 'Oda' },
  'admin.orders.description': {
    en: 'Card orders from the catalogue and the Try Our Service flow. Status changes here are real, manual reconciliation — no payment gateway is connected yet.',
    sw: 'Oda za kadi kutoka kwenye orodha na huduma ya Jaribu Huduma Yetu. Mabadiliko ya hali hapa ni ya kweli, ya kufanywa kwa mkono — hakuna mfumo wa malipo bado.',
  },
  'admin.orders.searchPlaceholder': { en: 'Search by customer name or phone...', sw: 'Tafuta kwa jina la mteja au namba...' },
  'admin.orders.loadFailed': { en: "Couldn't load orders", sw: 'Imeshindikana kupakia oda' },
  'admin.orders.empty': { en: 'No orders yet', sw: 'Hakuna oda bado' },
  'admin.orders.emptyDescription': {
    en: 'Orders placed through the catalogue or Try Our Service will appear here.',
    sw: 'Oda zilizowekwa kupitia orodha au Jaribu Huduma Yetu zitaonekana hapa.',
  },
  'admin.orders.customer': { en: 'Customer', sw: 'Mteja' },
  'admin.orders.card': { en: 'Card', sw: 'Kadi' },
  'admin.orders.tier': { en: 'Tier', sw: 'Kiwango' },
  'admin.orders.qty': { en: 'Qty', sw: 'Idadi' },
  'admin.orders.subtotal': { en: 'Subtotal', sw: 'Jumla' },
  'admin.orders.status': { en: 'Status', sw: 'Hali' },
  'admin.orders.payment': { en: 'Payment', sw: 'Malipo' },
  'admin.orders.delivery': { en: 'Delivery', sw: 'Utoaji' },
  'admin.orders.placed': { en: 'Placed', sw: 'Tarehe' },
  'admin.orders.updated': { en: 'Order updated', sw: 'Oda imesasishwa' },
  'admin.orders.updateFailed': { en: 'Could not update this order', sw: 'Imeshindikana kusasisha oda hii' },
};

/** Falls back to English, then to the raw key, so a missing translation is never blank. */
export function translate(key, language) {
  const entry = TRANSLATIONS[key];
  if (!entry) return key;
  return entry[language] || entry.en || key;
}
