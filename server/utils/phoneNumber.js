const { parsePhoneNumberFromString } = require('libphonenumber-js');

const DEFAULT_COUNTRY = 'BR';

function normalizePhoneNumber(value, defaultCountry = DEFAULT_COUNTRY) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const parsedWithoutDefault = parsePhoneNumberFromString(raw);
  if (parsedWithoutDefault?.isValid()) {
    return parsedWithoutDefault.number;
  }

  const parsedWithDefault = parsePhoneNumberFromString(raw, defaultCountry);
  if (parsedWithDefault?.isValid()) {
    return parsedWithDefault.number;
  }

  return null;
}

function buildPhoneCandidates(value, defaultCountry = DEFAULT_COUNTRY) {
  const raw = String(value || '').trim();
  const normalized = normalizePhoneNumber(raw, defaultCountry);
  const digits = raw.replace(/\D/g, '');
  const normalizedDigits = normalized ? normalized.replace(/\D/g, '') : '';

  const candidates = new Set();
  if (raw) candidates.add(raw);
  if (normalized) candidates.add(normalized);
  if (digits) candidates.add(digits);
  if (normalizedDigits) candidates.add(normalizedDigits);

  return [...candidates];
}

module.exports = {
  normalizePhoneNumber,
  buildPhoneCandidates,
};
