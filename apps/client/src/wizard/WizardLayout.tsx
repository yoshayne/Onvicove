import type { ReactNode } from 'react';
import WizardPreview from './WizardPreview';
import { useWizardStore } from './wizardStore';

const TOTAL_STEPS = 11;

const STEP_LABELS: Record<number, string> = {
  1: 'Business name',
  2: 'Store type',
  3: 'Theme',
  4: 'Brand info',
  5: 'Hero photo',
  6: 'Products',
  7: 'Services',
  8: 'Availability',
  9: 'Payments',
  10: 'Plan',
  11: 'Launch',
};

interface WizardLayoutProps {
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  nextLabel?: string;
  hideNav?: boolean;
}

export default function WizardLayout({
  children,
  onBack,
  onNext,
  canGoBack,
  canGoNext,
  nextLabel = 'Next',
  hideNav = false,
}: WizardLayoutProps) {
  const currentStep = useWizardStore((s) => s.currentStep);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-50 md:flex-row">
      {/* Left: step content (40%) */}
      <div className="flex h-full w-full flex-col md:w-[40%] md:min-w-[360px]">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
            <span>
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span>{STEP_LABELS[currentStep]}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {!hideNav && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onBack}
              disabled={!canGoBack}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {nextLabel}
            </button>
          </div>
        )}
      </div>

      {/* Right: live preview (60%) - desktop/tablet only */}
      <div className="hidden h-full w-[60%] border-l border-gray-200 md:block">
        <WizardPreview />
      </div>
    </div>
  );
}
