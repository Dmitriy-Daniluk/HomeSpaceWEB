const path = require('path');

const CYRILLIC_WORD_PATTERN = /^[А-Яа-яЁё]+$/u;
const CYRILLIC_VOWEL_PATTERN = /[АЕЁИОУЫЭЮЯаеёиоуыэюя]/u;
const CYRILLIC_CONSONANT_PATTERN = /[БВГДЖЗЙКЛМНПРСТФХЦЧШЩбвгджзйклмнпрстфхцчшщ]/u;
const TOKEN_SEPARATOR_PATTERN = /([ .()[\]{}_-]+)/;

const decodeLatin1Utf8 = (value) => {
  const original = String(value || '');
  if (!original) return original;

  try {
    const decoded = Buffer.from(original, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? original : decoded;
  } catch (error) {
    return original;
  }
};

const recoverLowByteCyrillicToken = (token) => {
  if (!token || !/^[\x01\x10-\x7F]+$/.test(token)) return token;
  if (!/[^A-Za-z0-9]/.test(token)) return token;

  const recovered = Array.from(token, (char) => {
    const code = char.charCodeAt(0);

    if (code === 0x01 || code === 0x51 || (code >= 0x10 && code <= 0x4f)) {
      return String.fromCharCode(0x0400 + code);
    }

    return char;
  }).join('');

  if (
    CYRILLIC_WORD_PATTERN.test(recovered) &&
    CYRILLIC_VOWEL_PATTERN.test(recovered) &&
    CYRILLIC_CONSONANT_PATTERN.test(recovered)
  ) {
    return recovered;
  }

  return token;
};

const recoverTruncatedUtf16Cyrillic = (value) => {
  const original = String(value || '');
  if (!original) return original;

  const ext = path.extname(original);
  const baseName = ext ? original.slice(0, -ext.length) : original;
  const recoveredBaseName = baseName
    .split(TOKEN_SEPARATOR_PATTERN)
    .map((part) => (TOKEN_SEPARATOR_PATTERN.test(part) ? part : recoverLowByteCyrillicToken(part)))
    .join('');

  return `${recoveredBaseName}${ext}`;
};

const normalizeUploadFileName = (value) => {
  const original = String(value || '').trim();
  if (!original) return original;

  const utf8Decoded = decodeLatin1Utf8(original);
  if (utf8Decoded && utf8Decoded !== original) {
    return utf8Decoded;
  }

  const recoveredCyrillic = recoverTruncatedUtf16Cyrillic(original);
  if (recoveredCyrillic && recoveredCyrillic !== original) {
    return recoveredCyrillic;
  }

  return original;
};

module.exports = {
  normalizeUploadFileName,
};
