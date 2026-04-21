const nodemailer = require('nodemailer');
const logger = require('./logger');

const isSmtpConfigured = () => Boolean(process.env.SMTP_HOST);

const createTransport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      }
    : undefined,
});

const sendPasswordResetEmail = async ({ to, token }) => {
  if (!isSmtpConfigured()) {
    logger.warn(`SMTP is not configured. Password reset token for ${to}: ${token}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl.replace(/\/$/, '')}/forgot-password?token=${encodeURIComponent(token)}`;
  const appName = process.env.APP_NAME || 'HomeSpace';
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'HomeSpace <no-reply@homespace.local>';

  await createTransport().sendMail({
    from,
    to,
    subject: `${appName}: восстановление пароля`,
    text: [
      'Вы запросили восстановление пароля.',
      `Код восстановления: ${token}`,
      `Ссылка: ${resetUrl}`,
      'Если вы не запрашивали сброс пароля, просто игнорируйте это письмо.',
    ].join('\n\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">Восстановление пароля ${appName}</h2>
        <p>Вы запросили восстановление пароля.</p>
        <p style="font-size: 16px;">Код восстановления:</p>
        <p style="font-size: 22px; font-weight: 700; letter-spacing: 2px;">${token}</p>
        <p>
          <a href="${resetUrl}" style="color: #4f46e5;">Открыть страницу восстановления</a>
        </p>
        <p style="color: #6b7280;">Если вы не запрашивали сброс пароля, просто игнорируйте это письмо.</p>
      </div>
    `,
  });

  return { sent: true };
};

module.exports = {
  sendPasswordResetEmail,
  isSmtpConfigured,
};
