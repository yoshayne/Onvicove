import { SignIn, SignUp } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';

const appearance = {
  variables: {
    colorPrimary: '#0f172a',
    colorBackground: '#ffffff',
    colorText: '#0f172a',
    borderRadius: '0.75rem',
    fontFamily: 'inherit',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none border border-slate-100 w-full',
    headerTitle: 'text-slate-900',
    headerSubtitle: 'text-slate-500',
    formButtonPrimary: 'bg-slate-900 hover:bg-slate-700 text-sm normal-case',
    footerActionLink: 'text-slate-900 hover:text-slate-700',
  },
};

interface AuthPageProps {
  mode: 'sign-in' | 'sign-up';
}

export default function AuthPage({ mode }: AuthPageProps) {
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/onboarding';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-slate-900">Shop Suite Direct</span>
          <p className="mt-1 text-xs font-medium tracking-wide text-slate-400">Build. Brand. Beautifully.</p>
          <p className="mt-2 text-sm text-slate-500">
            {mode === 'sign-in'
              ? 'Sign in to build and manage your site.'
              : 'Create an account to start building your site.'}
          </p>
        </div>

        {mode === 'sign-in' ? (
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl={redirectTo}
            appearance={appearance}
          />
        ) : (
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            forceRedirectUrl={redirectTo}
            appearance={appearance}
          />
        )}
      </div>
    </div>
  );
}
