import {
  FiAward,
  FiBriefcase,
  FiGift,
  FiHeart,
  FiMoreHorizontal,
  FiMusic,
  FiSend,
  FiSmile,
  FiStar,
} from 'react-icons/fi';

/**
 * Centralized event type catalog — mirrors backend EVENT_TYPES
 * (backend/src/constants/eventTypes.js). Adding a category only means
 * editing this array and the backend allowlist; no other rewrite needed.
 */
export const EVENT_TYPES = [
  { value: 'wedding', label: 'Wedding', description: 'Ceremonies and receptions', icon: FiHeart },
  { value: 'birthday', label: 'Birthday', description: 'Milestone birthdays and parties', icon: FiGift },
  { value: 'graduation', label: 'Graduation', description: 'Celebrate an achievement', icon: FiAward },
  { value: 'anniversary', label: 'Anniversary', description: 'Years worth celebrating', icon: FiStar },
  { value: 'send_off', label: 'Send Off', description: 'Farewells and bridal send-offs', icon: FiSend },
  { value: 'baby_shower', label: 'Baby Shower', description: 'Welcoming a new arrival', icon: FiSmile },
  { value: 'party', label: 'Party', description: 'Any reason to celebrate', icon: FiMusic },
  { value: 'corporate', label: 'Corporate', description: 'Launches and company events', icon: FiBriefcase },
  { value: 'other', label: 'Other', description: 'Something else entirely', icon: FiMoreHorizontal },
];

export function getEventTypeLabel(value) {
  return EVENT_TYPES.find((type) => type.value === value)?.label || value;
}
