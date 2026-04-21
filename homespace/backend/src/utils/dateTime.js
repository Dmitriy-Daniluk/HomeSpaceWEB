const pad = (value) => String(value).padStart(2, '0');

const formatDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('Invalid date time');
  }

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(' ');
};

const normalizeMySqlDateTime = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return formatDateTime(value);

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw} 00:00:00`;
  }

  const dateTimeMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(?::(\d{2}))?/);
  if (dateTimeMatch) {
    return `${dateTimeMatch[1]} ${dateTimeMatch[2]}:${dateTimeMatch[3] || '00'}`;
  }

  return formatDateTime(new Date(raw));
};

module.exports = {
  normalizeMySqlDateTime,
};
