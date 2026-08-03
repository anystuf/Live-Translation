export interface CommandMatch {
  type: 'enableCabin' | 'disableCabin' | 'none';
}

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/\p{P}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const enableCabinPatterns = [
  /^thông\s+dịch(?:\s*viên)?\s+cabin$/,
  /^dịch\s+cabin$/,
  /^cabin\s+(?:dịch|interpreter|translator)$/,
  /^dịch\s*viên\s+cabin$/,
];

const disableCabinPatterns = [
  /^tắt\s+dịch\s+cabin$/,
  /^dừng\s+dịch\s+cabin$/,
  /^tắt\s+thông\s+dịch\s+viên\s+cabin$/,
  /^dừng\s+thông\s+dịch\s+viên\s+cabin$/,
];

export function detectCabinCommand(text: string): CommandMatch {
  const normalized = normalizeText(text);
  if (!normalized) return { type: 'none' };

  for (const pattern of enableCabinPatterns) {
    if (pattern.test(normalized)) return { type: 'enableCabin' };
  }
  for (const pattern of disableCabinPatterns) {
    if (pattern.test(normalized)) return { type: 'disableCabin' };
  }

  return { type: 'none' };
}
