export const TEMPLATE_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'baby_shower', label: 'Baby Shower' },
  { value: 'party', label: 'Party' },
  { value: 'corporate', label: 'Corporate' },
];

export function getCategoryLabel(value) {
  return TEMPLATE_CATEGORIES.find((cat) => cat.value === value)?.label || value;
}
