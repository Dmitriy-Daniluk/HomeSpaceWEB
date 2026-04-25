import { getApiOrigin } from './api';

export function getAssetUrl(path) {
  if (!path || /^(https?:|data:|blob:)/i.test(path)) return path || '';

  const origin = getApiOrigin();
  if (!origin) return path;

  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
