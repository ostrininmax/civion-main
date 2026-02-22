import type { RequestStatus, VerificationResult } from '../models/types';
import type { BenefitPassScope } from '../verification-token';

export type DemoAction =
  | { type: 'goTo'; path: string }
  | { type: 'openDocument'; documentId: string }
  | { type: 'showToast'; messageKey: string; params?: Record<string, string | number> }
  | {
      type: 'addNotification';
      notificationType: 'expiry' | 'request' | 'message' | 'appointment' | 'security';
      titleKey: string;
      bodyKey: string;
      ctaHref?: string;
      ctaLabelKey?: string;
    }
  | {
      type: 'addAuditEvent';
      actor: string;
      result: VerificationResult;
      minimalDataKey: string;
    }
  | {
      type: 'setRequestStatus';
      requestId?: string;
      status: RequestStatus;
      timelineTitle?: string;
    }
  | {
      type: 'timelineEvent';
      requestId?: string;
      status?: RequestStatus;
      title: string;
    }
  | {
      type: 'generateVerificationToken';
      scopes: BenefitPassScope[];
      expiresInSeconds: number;
      status?: 'eligible' | 'not_eligible';
      issuer?: string;
      docType?: string;
    }
  | { type: 'markRightInactive'; rightId: string; sourceDocumentId?: string }
  | { type: 'markRightActive'; rightId: string; sourceDocumentId?: string }
  | { type: 'setTravelStatus'; status: 'idle' | 'in_progress' | 'cleared' | 'needs_proof' };

export type DemoScenarioStep = {
  id: string;
  titleKey: string;
  bodyKey: string;
  target?: string;
  actions?: DemoAction[];
};

export type DemoScenario = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  steps: DemoScenarioStep[];
};

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  'guided-tour': {
    id: 'guided-tour',
    titleKey: 'demo.tour.title',
    descriptionKey: 'demo.tour.description',
    steps: [
      {
        id: 'tour-language',
        titleKey: 'demo.tour.language.title',
        bodyKey: 'demo.tour.language.body',
        target: '[data-tour="language-switcher"]',
        actions: [{ type: 'goTo', path: '/' }]
      },
      {
        id: 'tour-step-1',
        titleKey: 'demo.tour.step1.title',
        bodyKey: 'demo.tour.step1.body',
        target: '[data-tour="wallet-registry-sync"]',
        actions: [{ type: 'goTo', path: '/wallet' }]
      },
      {
        id: 'tour-step-2',
        titleKey: 'demo.tour.step2.title',
        bodyKey: 'demo.tour.step2.body',
        target: '[data-tour="drawer-document-head"]',
        actions: [
          { type: 'goTo', path: '/wallet?filter=expiring' },
          { type: 'openDocument', documentId: 'doc-residence' }
        ]
      },
      {
        id: 'tour-step-3',
        titleKey: 'demo.tour.step3.title',
        bodyKey: 'demo.tour.step3.body',
        target: '[data-tour="drawer-share-controls"]'
      },
      {
        id: 'tour-step-4',
        titleKey: 'demo.tour.step4.title',
        bodyKey: 'demo.tour.step4.body',
        target: '[data-tour="civic-card-identity"]',
        actions: [{ type: 'goTo', path: '/civic-card' }]
      },
      {
        id: 'tour-step-5',
        titleKey: 'demo.tour.step5.title',
        bodyKey: 'demo.tour.step5.body',
        target: '[data-tour="civic-qr-frame"]',
        actions: [
          {
            type: 'generateVerificationToken',
            scopes: ['student_discount', 'trp_valid'],
            expiresInSeconds: 120,
            status: 'eligible'
          }
        ]
      },
      {
        id: 'tour-step-6',
        titleKey: 'demo.tour.step6.title',
        bodyKey: 'demo.tour.step6.body',
        target: '[data-tour="verify-result-card"]',
        actions: [{ type: 'goTo', path: '/verify?token={token}' }]
      },
      {
        id: 'tour-step-7',
        titleKey: 'demo.tour.step7.title',
        bodyKey: 'demo.tour.step7.body',
        target: '[data-tour="requests-list"]',
        actions: [
          {
            type: 'addAuditEvent',
            actor: 'Police',
            result: 'valid',
            minimalDataKey: 'wallet.checks_data_status_validity'
          },
          {
            type: 'addNotification',
            notificationType: 'security',
            titleKey: 'demo.notification.police_verified_title',
            bodyKey: 'demo.notification.police_verified_body',
            ctaHref: '/timeline',
            ctaLabelKey: 'notification.view_timeline'
          },
          {
            type: 'timelineEvent',
            title: 'Verification event logged',
            status: 'in_review'
          },
          { type: 'goTo', path: '/timeline' }
        ]
      },
      {
        id: 'tour-step-8',
        titleKey: 'demo.tour.step8.title',
        bodyKey: 'demo.tour.step8.body'
      }
    ]
  },
  'presenter-script': {
    id: 'presenter-script',
    titleKey: 'demo.presenter.title',
    descriptionKey: 'demo.presenter.description',
    steps: [
      {
        id: 'presenter-1',
        titleKey: 'demo.presenter.step1.title',
        bodyKey: 'demo.presenter.step1.body',
        actions: [{ type: 'goTo', path: '/wallet?filter=expiring&doc=doc-residence' }]
      },
      {
        id: 'presenter-2',
        titleKey: 'demo.presenter.step2.title',
        bodyKey: 'demo.presenter.step2.body',
        actions: [
          { type: 'goTo', path: '/wallet?filter=expiring' },
          {
            type: 'showToast',
            messageKey: 'demo.toast.renewal_started'
          }
        ]
      },
      {
        id: 'presenter-3',
        titleKey: 'demo.presenter.step3.title',
        bodyKey: 'demo.presenter.step3.body',
        actions: [
          {
            type: 'generateVerificationToken',
            scopes: ['student_discount', 'trp_valid', 'transport_concession'],
            expiresInSeconds: 120,
            status: 'eligible'
          },
          { type: 'goTo', path: '/civic-card' }
        ]
      },
      {
        id: 'presenter-4',
        titleKey: 'demo.presenter.step4.title',
        bodyKey: 'demo.presenter.step4.body',
        actions: [{ type: 'goTo', path: '/authority-check?mode=police&autoScan=1' }]
      },
      {
        id: 'presenter-5',
        titleKey: 'demo.presenter.step5.title',
        bodyKey: 'demo.presenter.step5.body',
        actions: [
          {
            type: 'addAuditEvent',
            actor: 'Police',
            result: 'valid',
            minimalDataKey: 'wallet.checks_data_status_validity'
          },
          {
            type: 'addNotification',
            notificationType: 'security',
            titleKey: 'demo.notification.police_verified_title',
            bodyKey: 'demo.notification.police_verified_body',
            ctaHref: '/timeline',
            ctaLabelKey: 'notification.view_timeline'
          },
          {
            type: 'timelineEvent',
            title: 'Verification event logged',
            status: 'in_review'
          },
          { type: 'goTo', path: '/timeline' }
        ]
      }
    ]
  },
  'police-check': {
    id: 'police-check',
    titleKey: 'demo.police.title',
    descriptionKey: 'demo.police.description',
    steps: [
      {
        id: 'police-check-start',
        titleKey: 'demo.police.title',
        bodyKey: 'demo.police.description',
        actions: [
          {
            type: 'generateVerificationToken',
            scopes: ['student_discount', 'trp_valid'],
            expiresInSeconds: 120,
            status: 'eligible'
          },
          { type: 'goTo', path: '/authority-check?mode=police' }
        ]
      }
    ]
  },
  'border-crossing': {
    id: 'border-crossing',
    titleKey: 'demo.border.title',
    descriptionKey: 'demo.border.description',
    steps: [
      {
        id: 'border-crossing-start',
        titleKey: 'demo.border.title',
        bodyKey: 'demo.border.description',
        actions: [
          { type: 'setTravelStatus', status: 'in_progress' },
          {
            type: 'generateVerificationToken',
            scopes: ['trp_valid', 'transport_concession'],
            expiresInSeconds: 90,
            status: 'eligible'
          },
          {
            type: 'addNotification',
            notificationType: 'request',
            titleKey: 'demo.notification.crossing_started_title',
            bodyKey: 'demo.notification.crossing_started_body',
            ctaHref: '/authority-check?mode=border',
            ctaLabelKey: 'common.open'
          },
          { type: 'goTo', path: '/authority-check?mode=border' }
        ]
      }
    ]
  }
};

export function getDemoScenario(id: string) {
  return DEMO_SCENARIOS[id] ?? null;
}
