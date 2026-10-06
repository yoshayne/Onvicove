import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import { apiGet, apiPost } from '../lib/api';
import Spinner from '../components/shared/Spinner';

interface InviteInfo {
  company_name: string;
  slug: string;
  invite_email: string;
  mode: string;
}

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const { isSignedIn, getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimed, setClaimed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Stash token in sessionStorage so the onboarding wizard can intercept
  useEffect(() => {
    if (!token) return;
    try { sessionStorage.setItem('pending_claim_token', token); } catch { /* ignore */ }
    apiGet<InviteInfo>(`/invite/${token}`)
      .then(setInvite)
      .catch((err) => setInviteError(err instanceof Error ? err.message : 'Invalid invite link'));
  }, [token]);

  // Auto-claim only after the user explicitly confirms they want to use this account
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !invite || !token || claimed || !confirmed) return;

    async function claim() {
      setClaiming(true);
      setClaimError('');
      try {
        const clerkToken = await getToken();
        await apiPost('/invite/claim', { token }, () => Promise.resolve(clerkToken));
        try { sessionStorage.removeItem('pending_claim_token'); } catch { /* ignore */ }
        setClaimed(true);
        setTimeout(() => navigate('/dashboard'), 1500);
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : 'Could not claim site');
        setClaiming(false);
        setConfirmed(false);
      }
    }

    claim();
  }, [isLoaded, isSignedIn, invite, token, claimed, confirmed, getToken, navigate]);

  // ── Loading states ─────────────────────────────────────────────────────────

  if (!invite && !inviteError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invite link issue</h1>
          <p className="text-slate-500 text-sm">{inviteError}</p>
          <p className="mt-4 text-xs text-slate-400">Ask your site builder to send a new invite.</p>
        </div>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">You're in!</h1>
          <p className="text-slate-500 text-sm">
            <strong>{invite!.company_name}</strong> is now yours. Taking you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (claiming) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-500 text-sm">Setting up your site…</p>
        </div>
      </div>
    );
  }

  // ── Not signed in ──────────────────────────────────────────────────────────

  if (!isLoaded || !isSignedIn) {
    const returnTo = `/claim/${token}`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 mb-4">
            <span className="text-2xl">🏪</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Your <span className="text-slate-600">{invite!.company_name}</span> site is ready
          </h1>
          <p className="mt-3 text-slate-500 text-sm leading-relaxed">
            Your store has already been built — log in to take ownership. No setup required.
          </p>
          {invite!.invite_email && (
            <p className="mt-3 text-xs text-slate-400">
              This invite was sent to <strong>{invite!.invite_email}</strong>.
            </p>
          )}
          <Link
            to="/sign-in"
            state={{ from: returnTo, isInviteClaim: true }}
            className="mt-6 block w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white text-center hover:bg-slate-700 transition"
          >
            Log in to access my site →
          </Link>
          <p className="mt-3 text-xs text-slate-400">
            New to Shop Suite Direct? You can create an account on the next screen.
          </p>
        </div>
      </div>
    );
  }

  // ── Already signed in — show confirmation so wrong accounts can't silently claim ──

  const signedInEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
  const isCorrectEmail = invite!.invite_email && signedInEmail?.toLowerCase() === invite!.invite_email.toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full flex flex-col gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 mb-4">
            <span className="text-2xl">🏪</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Claim <span className="text-slate-600">{invite!.company_name}</span>
          </h1>

          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            Signed in as <strong>{signedInEmail ?? 'your account'}</strong>
          </div>

          {!isCorrectEmail && invite!.invite_email && (
            <p className="mt-3 text-xs text-amber-600 font-medium">
              This invite was sent to <strong>{invite!.invite_email}</strong>. Make sure you're using the right account.
            </p>
          )}

          {claimError && (
            <p className="mt-3 text-sm text-red-600">{claimError}</p>
          )}

          <button
            onClick={() => setConfirmed(true)}
            className="mt-5 block w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white text-center hover:bg-slate-700 transition"
          >
            Yes, claim this site for my account →
          </button>

          <button
            onClick={() => signOut(() => {})}
            className="mt-2 block w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 text-center hover:bg-slate-50 transition"
          >
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
}
