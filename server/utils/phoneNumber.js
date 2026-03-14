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

  // Backward compatibility for legacy BR numbers saved with different formats.
  // Example: +5585999999999, 5585999999999, 85999999999, 085999999999.
  const addBrVariants = (digitsValue) => {
    if (!digitsValue) return;

    candidates.add(digitsValue);

    if (digitsValue.startsWith('0')) {
      candidates.add(digitsValue.replace(/^0+/, ''));
    }

    if (digitsValue.startsWith('55') && digitsValue.length > 11) {
      const withoutCountry = digitsValue.slice(2);
      candidates.add(withoutCountry);
      candidates.add(`0${withoutCountry}`);
    }

    if ((digitsValue.length === 10 || digitsValue.length === 11) && !digitsValue.startsWith('55')) {
      candidates.add(`55${digitsValue}`);
      candidates.add(`+55${digitsValue}`);
    }
  };

  addBrVariants(digits);
  addBrVariants(normalizedDigits);

  return [...candidates];
}

function buildPhoneLookupQuery(value, defaultCountry = DEFAULT_COUNTRY) {
  const candidates = buildPhoneCandidates(value, defaultCountry);
  const digitsOnly = String(value || '').replace(/\D/g, '');
  const regexCandidates = [];

  if (digitsOnly) {
    const withoutCountry =
      digitsOnly.startsWith('55') && digitsOnly.length > 11
        ? digitsOnly.slice(2)
        : digitsOnly;

    // Fallback for legacy records that may have been saved without DDI.
    if (withoutCountry.length >= 10) {
      regexCandidates.push(new RegExp(`${withoutCountry}$`));
    }
  }

  return {
    $or: [
      { phoneNumber: { $in: candidates } },
      ...regexCandidates.map((rx) => ({ phoneNumber: { $regex: rx } })),
    ],
  };
}

function normalizePhoneForComparison(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';

  let normalized = digits.replace(/^0+/, '');
  if (normalized.startsWith('55') && normalized.length > 11) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

function isSamePhoneNumber(left, right) {
  const l = normalizePhoneForComparison(left);
  const r = normalizePhoneForComparison(right);
  if (!l || !r) return false;
  if (l === r) return true;
  return l.endsWith(r) || r.endsWith(l);
}

async function findUserByPhone(UserModel, rawPhone) {
  const strictUser = await UserModel.findOne(buildPhoneLookupQuery(rawPhone));
  if (strictUser) return strictUser;

  const target = normalizePhoneForComparison(rawPhone);
  if (!target) return null;

  const tail = target.slice(-8);
  if (!tail) return null;

  const looseCandidates = await UserModel.find({
    phoneNumber: { $regex: tail },
  }).limit(50);

  return looseCandidates.find((u) => isSamePhoneNumber(u.phoneNumber, rawPhone)) || null;
}

module.exports = {
  normalizePhoneNumber,
  buildPhoneCandidates,
  buildPhoneLookupQuery,
  normalizePhoneForComparison,
  isSamePhoneNumber,
  findUserByPhone,
};
