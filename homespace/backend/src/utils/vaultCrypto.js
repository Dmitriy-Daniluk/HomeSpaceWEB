const crypto = require('crypto');

const PREFIX = 'hs-vault:v1:';

const getVaultKey = () => {
  const secret = process.env.PASSWORD_VAULT_KEY || process.env.JWT_SECRET || 'homespace-dev-vault-key';
  return crypto.createHash('sha256').update(secret).digest();
};

const encryptSecret = (value) => {
  if (value === undefined || value === null || value === '') return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getVaultKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  };

  return `${PREFIX}${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')}`;
};

const decryptSecret = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (!value.startsWith(PREFIX)) return value;

  const encoded = value.slice(PREFIX.length);
  const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getVaultKey(),
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

module.exports = {
  encryptSecret,
  decryptSecret,
};
