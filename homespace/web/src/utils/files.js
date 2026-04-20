export function getAssetUrl(path) {
  if (!path || /^(https?:|data:|blob:)/i.test(path)) return path || '';

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  try {
    const origin = new URL(apiBase).origin;
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  } catch {
    return path;
  }
}
