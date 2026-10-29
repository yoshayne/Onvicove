import { useState, type ReactNode } from 'react';
import { Eye } from 'lucide-react';
import WizardPreview from './WizardPreview';
import { useWizardStore, WIZARD_TOTAL_STEPS } from './wizardStore';

const TOTAL_STEPS = WIZARD_TOTAL_STEPS;

const STEP_LABELS: Record<number, string> = {
  1: 'Business name',
  2: 'Store type',
  3: 'Plan',
  4: 'Theme',
  5: 'Brand info',
  6: 'Hero photo',
  7: 'Products',
  8: 'Services',
  9: 'Staff & Hours',
  10: 'Launch',
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
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  return (
    // 100dvh follows the phone browser's toolbar, so Back / Next never slide below the visible screen
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-50 md:flex-row" style={{ height: '100dvh' }}>
      {/* Left: step content (40%) */}
      <div className="flex h-full w-full flex-col md:w-[40%] md:min-w-[360px]">
        <div className="border-b border-gray-200 bg-white px-4 pb-2.5 pt-3 md:px-6 md:py-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-gray-500 md:mb-2">
            <span>
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            <span>{STEP_LABELS[currentStep]}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors md:h-1.5 ${
                  step <= currentStep ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">{children}</div>

        <div
          className={`flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-3 md:px-6 md:py-4 ${hideNav ? 'md:hidden' : ''}`}
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {!hideNav ? (
            <button
              type="button"
              onClick={onBack}
              disabled={!canGoBack}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={() => setMobilePreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 md:hidden"
          >
            <Eye size={16} /> Preview
          </button>
          {!hideNav ? (
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {nextLabel}
            </button>
          ) : <span />}
        </div>
      </div>

      {/* Right: live preview (60%) - desktop/tablet only */}
      <div className="hidden h-full w-[60%] border-l border-gray-200 md:block">
        <WizardPreview />
      </div>

      {/* Mobile: slide-up live preview overlay */}
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-white transition-transform duration-300 md:hidden ${
          mobilePreviewOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <span className="text-sm font-medium text-gray-700">Live preview</span>
          <button
            type="button"
            onClick={() => setMobilePreviewOpen(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <WizardPreview />
        </div>
      </div>
    </div>
  );
}
