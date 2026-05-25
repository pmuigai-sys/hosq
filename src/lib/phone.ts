export function normalizeKenyanPhone(input: string): string | null {
  const cleaned = (input || "").replace(/\D/g, "");

  if (/^254[71]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (/^0[71]\d{8}$/.test(cleaned)) {
    return `+254${cleaned.slice(1)}`;
  }
  if (/^[71]\d{8}$/.test(cleaned)) {
    return `+254${cleaned}`;
  }

  return null;
}

export function isValidKenyanPhone(input: string): boolean {
  return normalizeKenyanPhone(input) !== null;
}
