import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
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
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimed, setClaimed] = useState(false);

  // Validate the token on load and stash it so the onboarding wizard can detect a pending claim
  useEffect(() => {
    if (!token) return;
    try { sessionStorage.setItem('pending_claim_token', token); } catch { /* ignore */ }
    apiGet<InviteInfo>(`/invite/${token}`)
      .then(setInvite)
      .catch((err) => setInviteError(err instanceof Error ? err.message : 'Invalid invite link'));
  }, [token]);

  // Once signed in and invite is valid, auto-claim
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !invite || !token || claimed) return;

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
      }
    }

    claim();
  }, [isLoaded, isSignedIn, invite, token, claimed, getToken, navigate]);

  // Invalid or expired token
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

  // Loading invite info
  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Claimed successfully
  if (claimed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-2xl border border-green-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">You're in!</h1>
          <p className="text-slate-500 text-sm">
            <strong>{invite.company_name}</strong> is now yours. Taking you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  // Claiming in progress
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

  // Not signed in yet — send to sign-in (which handles sign-up too) with return URL
  if (!isSignedIn) {
    const returnTo = `/claim/${token}`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 mb-4">
              <span className="text-2xl">🏪</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Your <span className="text-slate-600">{invite.company_name}</span> site is ready
            </h1>
            <p className="mt-3 text-slate-500 text-sm leading-relaxed">
              We've already built your store — you just need to log in to access it.
              No setup required.
            </p>
            {invite.invite_email && (
              <p className="mt-3 text-xs text-slate-400">
                This invite was sent to <strong>{invite.invite_email}</strong>.
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

          {claimError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 text-center">
              {claimError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Signed in but claim hasn't fired yet (shouldn't normally render)
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
