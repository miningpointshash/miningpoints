const STORAGE_KEY = 'mp_referral';

const normalizeUsername = (value) => {
  const v = String(value || '').trim();
  if (!v) return '';
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(v)) return '';
  return v;
};

export const setReferralUsername = (username) => {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ username: normalized, at: Date.now() })
  );
  return true;
};

export const getReferralUsername = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const username = normalizeUsername(parsed?.username);
    if (!username) return '';
    const at = Number(parsed?.at || 0);
    const maxAgeMs = 1000 * 60 * 60 * 24 * 30;
    if (!at || Date.now() - at > maxAgeMs) {
      localStorage.removeItem(STORAGE_KEY);
      return '';
    }
    return username;
  } catch {
    return '';
  }
};

export const clearReferralUsername = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const parseReferralFromLocation = (locationLike) => {
  let url;
  try {
    url = new URL(locationLike?.href || window.location.href);
  } catch {
    return { username: '', normalizedUrl: '' };
  }

  const params = url.searchParams;
  const fromQuery = normalizeUsername(params.get('ref'));

  const pathname = url.pathname || '/';
  const refPrefix = '/ref/';
  const fromPath = pathname.startsWith(refPrefix)
    ? normalizeUsername(decodeURIComponent(pathname.slice(refPrefix.length).split('/')[0] || ''))
    : '';

  const username = fromQuery || fromPath;
  if (!username) return { username: '', normalizedUrl: '' };

  const normalized = new URL(url.toString());
  normalized.pathname = '/';
  normalized.searchParams.set('ref', username);
  if (fromPath) normalized.searchParams.delete('view');

  return { username, normalizedUrl: normalized.toString() };
};

