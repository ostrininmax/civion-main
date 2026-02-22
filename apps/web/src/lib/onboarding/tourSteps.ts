import {
  DEFAULT_ONBOARDING_VARIANT,
  type OnboardingActionContext,
  type OnboardingStep,
  type OnboardingTourVariant
} from './tourEngine';

type OnboardingTourVariantConfig = {
  id: OnboardingTourVariant;
  titleKey: string;
  descriptionKey: string;
  steps: OnboardingStep[];
};

const ensureOnly = {
  actionBefore: (ctx: OnboardingActionContext) => {
    ctx.ensureDemoData();
  }
};

const premiumSteps: OnboardingStep[] = [
  {
    id: 'premium-intro',
    route: '/',
    target: '[data-tour="dashboard-hero"]',
    waitForSelector: '[data-tour="dashboard-hero"]',
    placement: 'bottom',
    titleKey: 'onboarding.premium.step1.title',
    bodyKey: 'onboarding.premium.step1.body',
    secondaryKey: 'onboarding.premium.step1.why',
    pacingMs: 360,
    ...ensureOnly
  },
  {
    id: 'premium-documents',
    route: '/wallet',
    target: '[data-tour="documents-grid"]',
    waitForSelector: '[data-tour="documents-grid"]',
    placement: 'top',
    titleKey: 'onboarding.premium.step2.title',
    bodyKey: 'onboarding.premium.step2.body',
    secondaryKey: 'onboarding.premium.step2.why',
    pacingMs: 360,
    ...ensureOnly
  },
  {
    id: 'premium-document-actions',
    route: '/wallet?filter=expiring&doc=doc-residence',
    target: '[data-tour="document-drawer-actions"]',
    waitForSelector: '[data-tour="document-drawer-actions"]',
    placement: 'left',
    titleKey: 'onboarding.premium.step3.title',
    bodyKey: 'onboarding.premium.step3.body',
    secondaryKey: 'onboarding.premium.step3.why',
    pacingMs: 420,
    ...ensureOnly
  },
  {
    id: 'premium-privacy-card',
    route: '/civic-card',
    target: '[data-tour="privacy-minimal-data"]',
    waitForSelector: '[data-tour="privacy-minimal-data"]',
    placement: 'top',
    titleKey: 'onboarding.premium.step4.title',
    bodyKey: 'onboarding.premium.step4.body',
    secondaryKey: 'onboarding.premium.step4.why',
    pacingMs: 420,
    ...ensureOnly
  },
  {
    id: 'premium-emergency-lock',
    route: '/security',
    target: '[data-tour="emergency-lock"]',
    waitForSelector: '[data-tour="emergency-lock"]',
    placement: 'top',
    titleKey: 'onboarding.premium.step5.title',
    bodyKey: 'onboarding.premium.step5.body',
    secondaryKey: 'onboarding.premium.step5.why',
    pacingMs: 380,
    ...ensureOnly
  },
  {
    id: 'premium-services',
    route: '/services',
    target: '[data-tour="services-start-request"]',
    waitForSelector: '[data-tour="services-start-request"]',
    placement: 'top',
    titleKey: 'onboarding.premium.step6.title',
    bodyKey: 'onboarding.premium.step6.body',
    secondaryKey: 'onboarding.premium.step6.why',
    pacingMs: 360,
    ...ensureOnly
  },
  {
    id: 'premium-transparency',
    route: '/security',
    target: '[data-tour="security-recent-checks"]',
    waitForSelector: '[data-tour="security-recent-checks"]',
    placement: 'top',
    titleKey: 'onboarding.premium.step7.title',
    bodyKey: 'onboarding.premium.step7.body',
    secondaryKey: 'onboarding.premium.step7.why',
    pacingMs: 420,
    ...ensureOnly
  },
  {
    id: 'finish',
    route: '/',
    target: '[data-tour="dashboard-quick-actions"]',
    waitForSelector: '[data-tour="dashboard-quick-actions"]',
    placement: 'top',
    titleKey: 'onboarding.premium.step8.title',
    bodyKey: 'onboarding.premium.step8.body',
    secondaryKey: 'onboarding.premium.step8.why',
    pacingMs: 320,
    ...ensureOnly
  }
];

const standardSteps: OnboardingStep[] = [
  {
    id: 'standard-welcome',
    route: '/',
    target: '[data-tour="dashboard-main"]',
    waitForSelector: '[data-tour="dashboard-main"]',
    placement: 'bottom',
    titleKey: 'onboarding.step1.title',
    bodyKey: 'onboarding.step1.body',
    pacingMs: 300,
    ...ensureOnly
  },
  {
    id: 'standard-documents',
    route: '/wallet?filter=expiring',
    target: '[data-tour="documents-grid"]',
    waitForSelector: '[data-tour="documents-grid"]',
    placement: 'top',
    titleKey: 'onboarding.step2.title',
    bodyKey: 'onboarding.step2.body',
    pacingMs: 300,
    ...ensureOnly
  },
  {
    id: 'standard-document-actions',
    route: '/wallet?filter=expiring&doc=doc-residence',
    target: '[data-tour="document-drawer-actions"]',
    waitForSelector: '[data-tour="document-drawer-actions"]',
    placement: 'left',
    titleKey: 'onboarding.step3.title',
    bodyKey: 'onboarding.step3.body',
    pacingMs: 340,
    ...ensureOnly
  },
  {
    id: 'standard-emergency',
    route: '/security',
    target: '[data-tour="emergency-lock"]',
    waitForSelector: '[data-tour="emergency-lock"]',
    placement: 'top',
    titleKey: 'onboarding.step4.title',
    bodyKey: 'onboarding.step4.body',
    pacingMs: 320,
    ...ensureOnly
  },
  {
    id: 'standard-civic',
    route: '/civic-card',
    target: '[data-tour="civic-qr"]',
    waitForSelector: '[data-tour="civic-qr"]',
    placement: 'right',
    titleKey: 'onboarding.step5.title',
    bodyKey: 'onboarding.step5.body',
    pacingMs: 320,
    ...ensureOnly
  },
  {
    id: 'standard-services',
    route: '/services',
    target: '[data-tour="services-catalog"]',
    waitForSelector: '[data-tour="services-catalog"]',
    placement: 'top',
    titleKey: 'onboarding.step7.title',
    bodyKey: 'onboarding.step7.body',
    pacingMs: 300,
    ...ensureOnly
  },
  {
    id: 'standard-notifications',
    route: '/notifications',
    target: '[data-tour="notifications-center"]',
    waitForSelector: '[data-tour="notifications-center"]',
    placement: 'top',
    titleKey: 'onboarding.step9.title',
    bodyKey: 'onboarding.step9.body',
    pacingMs: 300,
    ...ensureOnly
  },
  {
    id: 'finish',
    route: '/',
    target: '[data-tour="dashboard-quick-actions"]',
    waitForSelector: '[data-tour="dashboard-quick-actions"]',
    placement: 'top',
    titleKey: 'onboarding.step10.title',
    bodyKey: 'onboarding.step10.body',
    pacingMs: 260,
    ...ensureOnly
  }
];

export const onboardingTourVariants: Record<OnboardingTourVariant, OnboardingTourVariantConfig> = {
  premium: {
    id: 'premium',
    titleKey: 'onboarding.variant.premium',
    descriptionKey: 'onboarding.variant.premium_desc',
    steps: premiumSteps
  },
  standard: {
    id: 'standard',
    titleKey: 'onboarding.variant.standard',
    descriptionKey: 'onboarding.variant.standard_desc',
    steps: standardSteps
  }
};

export function getOnboardingTourVariant(variant?: OnboardingTourVariant) {
  return onboardingTourVariants[variant ?? DEFAULT_ONBOARDING_VARIANT] ?? onboardingTourVariants[DEFAULT_ONBOARDING_VARIANT];
}

// Backwards export for legacy imports.
export const onboardingTourSteps = onboardingTourVariants[DEFAULT_ONBOARDING_VARIANT].steps;
