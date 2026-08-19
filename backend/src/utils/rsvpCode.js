import { randomInt } from 'node:crypto';

/**
 * Human-friendly, URL-safe word list for RSVP codes (e.g.
 * "green-moon-river-sun-star"). Deliberately plain, unambiguous words —
 * no homophones, no numbers-as-words, nothing easily mistyped when read
 * aloud at a door/reception desk. 256 words so a 5-word code has 256^5
 * (~1.1 trillion) combinations — unguessable enough for this use case
 * (a card link, not a password), while staying easy for a human to read
 * back or type manually if the SMS link doesn't auto-link.
 */
const WORDS = [
  'amber', 'apple', 'arrow', 'ash', 'aspen', 'atlas', 'aurora', 'autumn', 'basil',
  'bay', 'beacon', 'birch', 'blossom', 'blue', 'bramble', 'breeze', 'brook', 'canyon', 'cedar',
  'cherry', 'chestnut', 'cliff', 'cloud', 'clover', 'coast', 'copper', 'coral', 'cotton', 'crane',
  'crescent', 'crimson', 'crystal', 'dawn', 'daisy', 'delta', 'desert', 'dew', 'dove', 'dune',
  'eagle', 'echo', 'ember', 'emerald', 'falcon', 'feather', 'fern', 'field', 'fig', 'fjord',
  'flame', 'flint', 'forest', 'fox', 'garnet', 'ginger', 'glacier', 'glade', 'gold', 'grove',
  'harbor', 'harvest', 'hawk', 'hazel', 'heather', 'hickory', 'holly', 'honey', 'horizon', 'ibis',
  'indigo', 'ivory', 'ivy', 'jade', 'jasmine', 'jay', 'juniper', 'kestrel', 'lagoon', 'lake',
  'lantern', 'laurel', 'lavender', 'leaf', 'lemon', 'lily', 'linen', 'lotus', 'lumen', 'lynx',
  'magnolia', 'maple', 'marble', 'marigold', 'meadow', 'mint', 'mist', 'moon', 'moss', 'myrtle',
  'nectar', 'nest', 'nova', 'oak', 'oasis', 'ocean', 'olive', 'onyx', 'opal', 'orchard',
  'orchid', 'osprey', 'otter', 'palm', 'pearl', 'pebble', 'peony', 'petal', 'pine', 'plum',
  'pond', 'poppy', 'prairie', 'quartz', 'quill', 'rain', 'raven', 'reed', 'reef', 'ridge',
  'river', 'robin', 'rose', 'ruby', 'sage', 'sail', 'sand', 'sapphire', 'savanna', 'sequoia',
  'shell', 'shore', 'silver', 'sky', 'slate', 'snow', 'sparrow', 'spring', 'spruce', 'star',
  'stone', 'storm', 'stream', 'summit', 'sun', 'sunrise', 'sunset', 'swan', 'sycamore', 'tide',
  'tiger', 'topaz', 'trail', 'tulip', 'tundra', 'valley', 'velvet', 'venus', 'vine', 'violet',
  'vista', 'walnut', 'water', 'wave', 'willow', 'wind', 'wing', 'winter', 'wisteria', 'wolf',
  'wren', 'zephyr', 'zenith', 'acacia', 'agate', 'alder', 'almond', 'alpine', 'anchor',
  'angel', 'antler', 'april', 'aqua', 'arbor', 'arctic', 'august', 'avenue', 'azure',
  'bamboo', 'banyan', 'baobab', 'beryl', 'bloom', 'bluebell', 'bluff', 'boulder',
  'breezy', 'bright', 'canary', 'candle', 'canopy', 'cardinal', 'carnation', 'cascade',
  'cavern', 'chalk', 'chamomile', 'cinder', 'citrine', 'clay',
  'clove', 'cobalt', 'columbine', 'comet', 'compass', 'cornflower', 'cove', 'cranberry', 'creek',
  'daffodil', 'dahlia', 'daybreak', 'december', 'diamond', 'dogwood', 'driftwood', 'edelweiss', 'elder',
  'elm', 'evergreen', 'fawn', 'firefly', 'flourish', 'foxglove', 'freesia',
  'frost', 'gale', 'garden', 'geranium', 'glimmer', 'goldfinch', 'goldenrod', 'granite', 'gull', 'harmony',
  'heron', 'highland', 'hollow', 'honeysuckle', 'hyacinth', 'iris', 'island', 'jasper',
  'kite', 'lark', 'ledge', 'lighthouse', 'lilac', 'linden', 'lookout', 'luna',
];

function pickWord() {
  return WORDS[randomInt(WORDS.length)];
}

/** Returns a URL-safe 5-word phrase, e.g. "green-moon-river-sun-star". Not guaranteed unique on its own — callers must retry on a DB unique-constraint violation. */
export function generateRsvpCode() {
  return Array.from({ length: 5 }, pickWord).join('-');
}
