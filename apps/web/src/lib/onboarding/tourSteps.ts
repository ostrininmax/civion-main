import type { OnboardingActionContext, OnboardingStep } from './tourEngine';

const ensureOnly = {
  actionBefore: (ctx: OnboardingActionContext) => {
    ctx.ensureDemoData();
  }
};

export const onboardingTourSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    route: '/',
    target: '[data-tour="dashboard-main"]',
    waitForSelector: '[data-tour="dashboard-main"]',
    placement: 'bottom',
    titleKey: 'onboarding.step1.title',
    bodyKey: 'onboarding.step1.body',
    ...ensureOnly
  },
  {
    id: 'documents',
    route: '/wallet?filter=expiring',
    target: '[data-tour="documents-grid"]',
    waitForSelector: '[data-tour="documents-grid"]',
    placement: 'top',
    titleKey: 'onboarding.step2.title',
    bodyKey: 'onboarding.step2.body',
    ...ensureOnly
  },
  {
    id: 'document-actions',
    route: '/wallet?filter=expiring&doc=doc-residence',
    target: '[data-tour="document-drawer-actions"]',
    waitForSelector: '[data-tour="document-drawer-actions"]',
    placement: 'left',
    titleKey: 'onboarding.step3.title',
    bodyKey: 'onboarding.step3.body',
    ...ensureOnly
  },
  {
    id: 'emergency-lock',
    route: '/security',
    target: '[data-tour="emergency-lock-btn"]',
    waitForSelector: '[data-tour="emergency-lock-btn"]',
    placement: 'bottom',
    titleKey: 'onboarding.step4.title',
    bodyKey: 'onboarding.step4.body',
    ...ensureOnly
  },
  {
    id: 'civic-card',
    route: '/civic-card',
    target: '[data-tour="civic-qr"]',
    waitForSelector: '[data-tour="civic-qr"]',
    placement: 'right',
    titleKey: 'onboarding.step5.title',
    bodyKey: 'onboarding.step5.body',
    ...ensureOnly
  },
  {
    id: 'privacy-verification',
    route: '/civic-card',
    target: '[data-tour="verifier-privacy"]',
    waitForSelector: '[data-tour="verifier-privacy"]',
    placement: 'top',
    titleKey: 'onboarding.step6.title',
    bodyKey: 'onboarding.step6.body',
    ...ensureOnly
  },
  {
    id: 'services',
    route: '/services',
    target: '[data-tour="services-catalog"]',
    waitForSelector: '[data-tour="services-catalog"]',
    placement: 'top',
    titleKey: 'onboarding.step7.title',
    bodyKey: 'onboarding.step7.body',
    ...ensureOnly
  },
  {
    id: 'requests',
    route: '/timeline',
    target: '[data-tour="requests-tracker"]',
    waitForSelector: '[data-tour="requests-tracker"]',
    placement: 'top',
    titleKey: 'onboarding.step8.title',
    bodyKey: 'onboarding.step8.body',
    ...ensureOnly
  },
  {
    id: 'notifications',
    route: '/notifications',
    target: '[data-tour="notifications-center"]',
    waitForSelector: '[data-tour="notifications-center"]',
    placement: 'top',
    titleKey: 'onboarding.step9.title',
    bodyKey: 'onboarding.step9.body',
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
    ...ensureOnly
  }
];
