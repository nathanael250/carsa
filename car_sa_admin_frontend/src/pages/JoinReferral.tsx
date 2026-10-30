import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import logo from '../assets/carsa.png';
import {
  parseReferralCode,
  playStoreLinkWithCode,
  PLAY_STORE_URL,
  rememberReferralCode,
  rememberedReferralCode,
} from '../utils/referral';

/**
 * Public page behind a reseller's share link (`/join?ref=RSXXXXXX`).
 * Garages register on the web with the code filled in, or install the app;
 * the Play Store passes the code to the app so the sign-up form fills it in too.
 */
const JoinReferral = () => {
  const [searchParams] = useSearchParams();
  const code = useMemo(
    () => parseReferralCode(searchParams.get('ref')) || rememberedReferralCode(),
    [searchParams]
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (code) rememberReferralCode(code);
  }, [code]);

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEA14C] to-[#FE8A21] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* The logo is white, so it sits on an orange badge. */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FEA14C]">
          <img src={logo} alt="CarSa" className="h-11 w-11 object-contain" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Join CarSa</h1>
        <p className="mt-2 text-gray-700">
          Manage your garage, register customers' cars and record every service in one app.
        </p>

        {code ? (
          <div className="mt-6 rounded-xl border-2 border-dashed border-[#FEA14C] bg-[#FEA14C]/10 p-4">
            <p className="text-sm text-gray-700">You were invited with referral code</p>
            <p className="mt-1 text-3xl font-bold tracking-[0.2em] text-[#2F4858] font-mono">{code}</p>
            <button onClick={copyCode} className="mt-2 text-sm font-medium text-[#C25E00] hover:underline">
              {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-amber-800">This link has no referral code. You can still register below.</p>
        )}

        <div className="mt-6 space-y-3">
          <Link
            to={code ? `/register-garage-admin?ref=${encodeURIComponent(code)}` : '/register-garage-admin'}
            className="block w-full rounded-xl bg-[#2F4858] px-4 py-3 font-semibold text-white hover:bg-[#243845]"
          >
            Register your garage
          </Link>
          <a
            href={code ? playStoreLinkWithCode(code) : PLAY_STORE_URL}
            className="block w-full rounded-xl border-2 border-[#2F4858] px-4 py-3 font-semibold text-[#2F4858] hover:bg-gray-50"
          >
            Get the Android app
          </a>
        </div>

        {code && (
          <p className="mt-4 text-xs text-gray-600">
            In the app, the code is filled in for you when you install it from this button. If it isn't, enter{' '}
            <span className="font-mono font-semibold">{code}</span> when you sign up as a garage.
          </p>
        )}
      </div>
    </div>
  );
};

export default JoinReferral;
