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

  // Validate the token on load
  useEffect(() => {
    if (!token) return;
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
        setClaimed(true);
        // Give the server a moment, then redirect to dashboard
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

  // Not signed in yet — prompt to sign in / sign up, then return here
  if (!isSignedIn) {
    const returnTo = `/claim/${token}`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
              <span className="text-2xl">🏪</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Your site is ready</h1>
            <p className="mt-2 text-slate-500 text-sm">
              <strong className="text-slate-800">{invite.company_name}</strong> has been built for you on Shop Suite Direct.
              Create a free account or sign in to take ownership.
            </p>
            {invite.invite_email && (
              <p className="mt-3 text-xs text-slate-400">
                Invite sent to <strong>{invite.invite_email}</strong> — use that email when signing up.
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/sign-up"
                state={{ from: returnTo }}
                className="block w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white text-center hover:bg-slate-700 transition"
              >
                Create my free account
              </Link>
              <Link
                to="/sign-in"
                state={{ from: returnTo }}
                className="block w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 text-center hover:bg-slate-50 transition"
              >
                I already have an account
              </Link>
            </div>
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
