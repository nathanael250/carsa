/** Reseller referral codes in links: `/join?ref=RSXXXXXX`. */
const STORAGE_KEY = 'carsa_referral_code';
const CODE_PATTERN = /RS[A-Z0-9]{6}/;

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.transpip.carsa';

/** Extracts a code from a raw value like "rs-ab12cd34" or "ref=RSAB12CD". */
export const parseReferralCode = (raw?: string | null): string | null => {
  if (!raw) return null;
  const match = raw.toUpperCase().replace(/[\s-]+/g, '').match(CODE_PATTERN);
  return match ? match[0] : null;
};

/** Remembers the code for this browser, so it survives moving between pages. */
export const rememberReferralCode = (code: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode: the code is still in the URL.
  }
};

export const rememberedReferralCode = (): string | null => {
  try {
    return parseReferralCode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

/** The link a reseller shares. */
export const referralJoinLink = (code: string) => `${window.location.origin}/join?ref=${encodeURIComponent(code)}`;

/** Play Store link that hands the code to the app after install (Android "install referrer"). */
export const playStoreLinkWithCode = (code: string) =>
  `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`ref=${code}`)}`;
