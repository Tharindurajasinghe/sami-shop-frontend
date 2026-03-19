// Unit options for products
export const UNIT_OPTIONS = [
  { value: 'unit', label: 'Unit (Piece/Item)' },
  { value: 'Kg', label: 'Kg (Kilograms)' },
  { value: 'g', label: 'g (grams)' },
  { value: 'L', label: 'L (Liter)' },
  { value: 'ml', label: 'ml (milliliter)' },
];

export const getUnitLabel = (unit) => {
  const option = UNIT_OPTIONS.find(opt => opt.value === unit);
  return option ? option.label : 'unit';
};

export const getUnitShort = (unit) => {
  return unit || 'unit';
};
