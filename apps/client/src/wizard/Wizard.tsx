import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WizardLayout from './WizardLayout';
import { useWizardStore, selectWizardCompleteness, type WizardState } from './wizardStore';
import { useApi } from '../lib/api';

import Step1_BusinessName from './steps/Step1_BusinessName';
import Step2_Mode from './steps/Step2_Mode';
import Step3_Theme from './steps/Step3_Theme';
import Step4_BrandInfo from './steps/Step4_BrandInfo';
import Step5_HeroPhoto from './steps/Step5_HeroPhoto';
import Step6_Products from './steps/Step6_Products';
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
  7: Step7_Availability,
  8: Step8_Payments,
  9: Step9_Plan,
  10: Step10_Launch,
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
      imageKeys: [],
    })),
    staff: state.staff.map((st) => ({
      name: st.name,
      email: st.email,
      availability: state.availability,
    })),
  };
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

  const StepComponent = STEP_COMPONENTS[currentStep] ?? Step1_BusinessName;

  // Persist progress as a draft tenant so uploads and other authenticated
  // wizard actions have a tenant row to attach to from step 1 onward.
  useEffect(() => {
    api.post('/wizard/save', {
      wizard_step: currentStep,
      wizard_data: buildWizardData(state),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  async function handleLaunch() {
    setIsLaunching(true);
    setLaunchError(null);
    try {
      await api.post('/wizard/save', {
        wizard_step: currentStep,
        wizard_data: buildWizardData(state),
      });
      const result = await api.post<WizardCompleteResponse>('/wizard/complete');
      setLaunchedSlug(result.tenant.slug || state.slug);
      reset();
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Failed to launch site');
    } finally {
      setIsLaunching(false);
    }
  }

  function handleNext() {
    if (currentStep === 10) return;
    nextStep();
  }

  const completeness = selectWizardCompleteness(state);
  const isLastStep = currentStep === 10;

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
          onGoToSite={(slug) => navigate(`/${slug}`)}
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
  onGoToSite: (slug: string) => void;
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
  onGoToSite,
}: Step10LaunchControlsProps) {
  if (launchedSlug) {
    return (
      <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <p className="mb-2 text-sm font-medium text-green-800">
          🎉 Your site is live!
        </p>
        <button
          type="button"
          onClick={() => onGoToSite(launchedSlug)}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          View your site /{launchedSlug}
        </button>
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
