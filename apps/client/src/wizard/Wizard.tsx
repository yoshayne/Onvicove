import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import WizardLayout from './WizardLayout';
import { useWizardStore, selectWizardCompleteness, type WizardState } from './wizardStore';
import { useApi } from '../lib/api';

import StripePaymentForm from '../themes/shared/StripePaymentForm';
import Step1_BusinessName from './steps/Step1_BusinessName';
import Step2_Mode from './steps/Step2_Mode';
import Step3_Theme from './steps/Step3_Theme';
import Step4_BrandInfo from './steps/Step4_BrandInfo';
import Step5_HeroPhoto from './steps/Step5_HeroPhoto';
import Step6_Products from './steps/Step6_Products';
import Step6b_Services from './steps/Step6b_Services';
import Step7_Availability from './steps/Step7_Availability';
import Step8_Payments from './steps/Step8_Payments';
import Step9_Plan from './steps/Step9_Plan';
import Step10_Launch from './steps/Step10_Launch';

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: Step1_BusinessName,
  2: Step2_Mode,
  3: Step3_Theme,
  4: Step4_BrandInfo,
  5: Step5_HeroPhoto,
  6: Step6_Products,
  7: Step6b_Services,
  8: Step7_Availability,
  9: Step8_Payments,
  10: Step9_Plan,
  11: Step10_Launch,
};

export interface WizardCompleteResponse {
  tenant: { slug: string };
}

function buildWizardData(state: WizardState) {
  return {
    businessName: state.businessName,
    tagline: state.tagline,
    mode: state.mode,
    themeId: state.themeId,
    brandColor: state.brandColor,
    city: state.city,
    industry: state.industry,
    logoKey: state.logoFileKey,
    faviconKey: state.faviconFileKey,
    heroImageKey: state.heroImageFileKey,
    plan: state.plan,
    products: state.products.map((p) => ({
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      imageKeys: p.imageKey ? [p.imageKey] : [],
      type: 'physical',
    })),
    services: state.services.map((s) => ({
      name: s.name,
      description: s.description,
      priceCents: s.priceCents,
      durationMinutes: s.durationMinutes,
      requiresDeposit: s.requiresDeposit ?? false,
      depositCents: s.requiresDeposit ? s.depositCents ?? 0 : null,
      imageKeys: [],
    })),
    staff: state.staff.map((st) => ({
      name: st.name,
      email: st.email,
      availability: state.availability,
    })),
  };
}

interface WizardProgressResponse {
  wizard_step: number;
  wizard_data: Record<string, unknown>;
  wizard_completed: boolean;
  slug?: string;
}

function applyWizardData(state: WizardState, data: Record<string, unknown>, slug?: string) {
  const d = data as Record<string, any>;
  if (typeof d.businessName === 'string') state.setBusinessName(d.businessName);
  if (slug) state.setSlug(slug);
  if (typeof d.tagline === 'string') state.setTagline(d.tagline);
  if (d.mode) state.setMode(d.mode);
  if (d.themeId) state.setThemeId(d.themeId);
  if (typeof d.brandColor === 'string') state.setBrandColor(d.brandColor);
  if (typeof d.city === 'string') state.setCity(d.city);
  if (typeof d.industry === 'string') state.setIndustry(d.industry);
  if (typeof d.logoKey === 'string') state.setLogo(d.logoKey, undefined);
  if (typeof d.faviconKey === 'string') state.setFavicon(d.faviconKey, undefined);
  if (typeof d.heroImageKey === 'string') state.setHeroImage(d.heroImageKey, undefined);
  if (d.plan) state.setPlan(d.plan);

  if (Array.isArray(d.products)) {
    for (const p of d.products) {
      state.addProduct({
        id: uuidv4(),
        name: p.name ?? '',
        description: p.description ?? '',
        priceCents: p.priceCents ?? 0,
        imageKey: Array.isArray(p.imageKeys) ? p.imageKeys[0] : undefined,
      });
    }
  }

  if (Array.isArray(d.services)) {
    for (const s of d.services) {
      state.addService({
        id: uuidv4(),
        name: s.name ?? '',
        description: s.description ?? '',
        priceCents: s.priceCents ?? 0,
        durationMinutes: s.durationMinutes ?? 30,
        requiresDeposit: s.requiresDeposit ?? false,
        depositCents: s.depositCents ?? null,
      });
    }
  }

  if (Array.isArray(d.staff)) {
    for (const st of d.staff) {
      if (st.availability) state.setAvailability(st.availability);
      state.addStaff({ id: uuidv4(), name: st.name ?? '', email: st.email });
    }
  }
}

export default function Wizard() {
  const navigate = useNavigate();
  const currentStep = useWizardStore((s) => s.currentStep);
  const nextStep = useWizardStore((s) => s.nextStep);
  const prevStep = useWizardStore((s) => s.prevStep);
  const reset = useWizardStore((s) => s.reset);
  const state = useWizardStore();
  const api = useApi();

  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchedSlug, setLaunchedSlug] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [subClientSecret, setSubClientSecret] = useState<string | null>(null);
  const [subPriceCents, setSubPriceCents] = useState(0);

  const StepComponent = STEP_COMPONENTS[currentStep] ?? Step1_BusinessName;

  // On first load, restore any progress saved to the server so the wizard
  // can pick up where the user left off (e.g. on a new device or after
  // clearing local storage). Only applies if local state looks empty.
  useEffect(() => {
    if (state.businessName.trim().length > 0) {
      setHydrated(true);
      return;
    }
    api
      .get<WizardProgressResponse>('/wizard/progress')
      .then((progress) => {
        if (progress.wizard_completed) {
          navigate('/dashboard', { replace: true });
          return;
        }
        if (progress.wizard_step > 0) {
          applyWizardData(state, progress.wizard_data, progress.slug);
          useWizardStore.getState().setStep(Math.min(11, Math.max(1, progress.wizard_step)));
        }
      })
      .catch((err) => console.error('wizard/progress failed:', err))
      .finally(() => setHydrated(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress as a draft tenant so uploads and other authenticated
  // wizard actions have a tenant row to attach to from step 1 onward.
  useEffect(() => {
    if (!hydrated) return;
    api.post('/wizard/save', {
      wizard_step: currentStep,
      wizard_data: buildWizardData(state),
    }).catch((err) => console.error('wizard/save failed:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, hydrated]);

  async function handleLaunch() {
    setIsLaunching(true);
    setLaunchError(null);
    try {
      await api.post('/wizard/save', {
        wizard_step: currentStep,
        wizard_data: buildWizardData(state),
      });
      const result = await api.post<WizardCompleteResponse>('/wizard/complete');
      const slug = result.tenant.slug || state.slug;
      setLaunchedSlug(slug);

      // If tenant chose a paid plan, kick off subscription payment
      if (state.plan === 'pro' || state.plan === 'business') {
        try {
          const sub = await api.post<{ clientSecret?: string; upgraded?: boolean; status: string }>(
            '/subscriptions/create',
            { plan: state.plan }
          );
          if (sub.clientSecret) {
            setSubPriceCents(state.plan === 'pro' ? 2900 : 7900);
            setSubClientSecret(sub.clientSecret);
          }
        } catch {
          // Subscription can be set up from dashboard/billing — non-blocking
        }
      }
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Failed to launch site');
    } finally {
      setIsLaunching(false);
    }
  }

  function handleNext() {
    if (currentStep === 11) return;
    nextStep();
  }

  const completeness = selectWizardCompleteness(state);
  const isLastStep = currentStep === 11;

  return (
    <WizardLayout
      onBack={prevStep}
      onNext={isLastStep ? handleLaunch : handleNext}
      canGoBack={currentStep > 1 && !launchedSlug}
      canGoNext={
        isLastStep ? completeness.isReadyToLaunch && !isLaunching && !launchedSlug : true
      }
      nextLabel={isLastStep ? (isLaunching ? 'Launching…' : 'Launch my site') : 'Next'}
      hideNav={isLastStep}
    >
      <StepComponent />
      {isLastStep && (
        <Step10LaunchControls
          onLaunch={handleLaunch}
          isLaunching={isLaunching}
          error={launchError}
          launchedSlug={launchedSlug}
          canLaunch={completeness.isReadyToLaunch}
          onBack={prevStep}
          subClientSecret={subClientSecret}
          subPriceCents={subPriceCents}
          onSubPaymentSuccess={() => setSubClientSecret(null)}
          onSubPaymentCancel={() => setSubClientSecret(null)}
          onGoToSite={(slug) => {
            reset();
            navigate(`/${slug}`);
          }}
          onGoToDashboard={() => {
            reset();
            navigate('/dashboard');
          }}
        />
      )}
    </WizardLayout>
  );
}

interface Step10LaunchControlsProps {
  onLaunch: () => void;
  isLaunching: boolean;
  error: string | null;
  launchedSlug: string | null;
  canLaunch: boolean;
  onBack: () => void;
  subClientSecret: string | null;
  subPriceCents: number;
  onSubPaymentSuccess: () => void;
  onSubPaymentCancel: () => void;
  onGoToSite: (slug: string) => void;
  onGoToDashboard: () => void;
}

// Step10 renders its own review UI; this small block wires the actual
// launch action + navigation controls that WizardLayout hides for step 10.
function Step10LaunchControls({
  onLaunch,
  isLaunching,
  error,
  launchedSlug,
  canLaunch,
  onBack,
  subClientSecret,
  subPriceCents,
  onSubPaymentSuccess,
  onSubPaymentCancel,
  onGoToSite,
  onGoToDashboard,
}: Step10LaunchControlsProps) {
  if (launchedSlug) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <p className="mb-2 text-sm font-medium text-green-800">
            Your site is live!
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onGoToSite(launchedSlug)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              View your site /{launchedSlug}
            </button>
            <button
              type="button"
              onClick={() => onGoToDashboard()}
              className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
            >
              Go to dashboard
            </button>
          </div>
        </div>

        {subClientSecret && (
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="mb-1 text-base font-semibold text-gray-900">Activate your plan</p>
            <p className="mb-4 text-sm text-gray-500">
              Enter your payment details to activate your subscription and unlock premium features.
            </p>
            <StripePaymentForm
              clientSecret={subClientSecret}
              amountCents={subPriceCents}
              onSuccess={onSubPaymentSuccess}
              onCancel={onSubPaymentCancel}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onLaunch}
          disabled={!canLaunch || isLaunching}
          className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLaunching ? 'Launching…' : 'Launch my site'}
        </button>
      </div>
    </div>
  );
}
