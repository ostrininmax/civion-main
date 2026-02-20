export type InteractionType = 'button' | 'icon-button' | 'link' | 'card' | 'chip' | 'menu' | 'input';

export type InteractionStatus = 'Working' | 'Broken' | 'Missing';

export type InteractionChecklistItem = {
  id: string;
  page: string;
  label: string;
  type: InteractionType;
  expectedBehavior: string;
  status: InteractionStatus;
  fixNotes: string;
};

export const INTERACTION_CHECKLIST: InteractionChecklistItem[] = [
  {
    id: 'dash-nextstep-renew',
    page: 'Dashboard',
    label: 'Next step: Renew now',
    type: 'card',
    expectedBehavior: 'Navigates to /wallet with expiring filter pre-applied.',
    status: 'Working',
    fixNotes: 'Deep link: /wallet?filter=expiring.'
  },
  {
    id: 'dash-nextstep-profile',
    page: 'Dashboard',
    label: 'Next step: Complete profile',
    type: 'card',
    expectedBehavior: 'Navigates to a profile/data completion path.',
    status: 'Working',
    fixNotes: 'Uses link to /wallet?filter=expired for missing documents flow.'
  },
  {
    id: 'dash-nextstep-track',
    page: 'Dashboard',
    label: 'Next step: Track request',
    type: 'card',
    expectedBehavior: 'Opens current request details in timeline.',
    status: 'Working',
    fixNotes: 'Dynamic deep-link to /timeline/[id].'
  },
  {
    id: 'dash-search-results',
    page: 'Dashboard',
    label: 'Global search result item',
    type: 'link',
    expectedBehavior: 'Navigates to matched document/service/request page.',
    status: 'Working',
    fixNotes: 'Result badge indicates Document / Service / Request.'
  },
  {
    id: 'dash-quick-upload',
    page: 'Dashboard',
    label: 'Quick action: Upload document',
    type: 'link',
    expectedBehavior: 'Navigates to wallet where document actions are available.',
    status: 'Working',
    fixNotes: 'Route is /wallet.'
  },
  {
    id: 'dash-quick-share',
    page: 'Dashboard',
    label: 'Quick action: Share proof',
    type: 'link',
    expectedBehavior: 'Navigates to Civic Card with QR proof actions.',
    status: 'Working',
    fixNotes: 'Route is /civic-card.'
  },
  {
    id: 'dash-stat-expiring',
    page: 'Dashboard',
    label: 'Documents stat hint: expiring soon',
    type: 'link',
    expectedBehavior: 'Opens expiring documents list.',
    status: 'Working',
    fixNotes: 'Route is /wallet?filter=expiring.'
  },
  {
    id: 'dash-featured-civic',
    page: 'Dashboard',
    label: 'Featured Civic Card CTA',
    type: 'link',
    expectedBehavior: 'Opens Civic Card page.',
    status: 'Working',
    fixNotes: 'Route is /civic-card.'
  },
  {
    id: 'wallet-filter-all',
    page: 'Documents (/wallet)',
    label: 'Filter chip: All',
    type: 'chip',
    expectedBehavior: 'Shows all documents and updates route state.',
    status: 'Working',
    fixNotes: 'Uses router replace(/wallet).'
  },
  {
    id: 'wallet-filter-expiring',
    page: 'Documents (/wallet)',
    label: 'Filter chip: Expiring soon',
    type: 'chip',
    expectedBehavior: 'Shows expiring documents and updates route state.',
    status: 'Working',
    fixNotes: 'Uses router replace(/wallet?filter=expiring).'
  },
  {
    id: 'wallet-filter-expired',
    page: 'Documents (/wallet)',
    label: 'Filter chip: Expired',
    type: 'chip',
    expectedBehavior: 'Shows expired documents and updates route state.',
    status: 'Working',
    fixNotes: 'Uses router replace(/wallet?filter=expired).'
  },
  {
    id: 'wallet-open-card',
    page: 'Documents (/wallet)',
    label: 'Document card click',
    type: 'card',
    expectedBehavior: 'Opens details drawer with document metadata and actions.',
    status: 'Working',
    fixNotes: 'Supports mouse and keyboard Enter/Space.'
  },
  {
    id: 'wallet-renew',
    page: 'Documents (/wallet)',
    label: 'Renew button',
    type: 'button',
    expectedBehavior: 'Opens renewal flow modal and sets renewal status after completion.',
    status: 'Working',
    fixNotes: 'Updates in-progress banner and history.'
  },
  {
    id: 'wallet-share',
    page: 'Documents (/wallet)',
    label: 'Share proof button',
    type: 'button',
    expectedBehavior: 'Generates share link, copies to clipboard, logs verification, shows toast.',
    status: 'Working',
    fixNotes: 'Adds audit/recent check entry.'
  },
  {
    id: 'wallet-reminder',
    page: 'Documents (/wallet)',
    label: 'Set reminder button',
    type: 'button',
    expectedBehavior: 'Creates reminder and updates app feedback.',
    status: 'Working',
    fixNotes: 'Routes through reminder API and refresh.'
  },
  {
    id: 'wallet-drawer-share-link',
    page: 'Documents drawer',
    label: 'Generate share link',
    type: 'button',
    expectedBehavior: 'Creates share with selected duration/fields and copies link.',
    status: 'Working',
    fixNotes: 'Persists in document meta shares list.'
  },
  {
    id: 'wallet-drawer-revoke',
    page: 'Documents drawer',
    label: 'Revoke link',
    type: 'button',
    expectedBehavior: 'Revokes selected share and updates history.',
    status: 'Working',
    fixNotes: 'Changes share item state to revoked.'
  },
  {
    id: 'wallet-drawer-download',
    page: 'Documents drawer',
    label: 'Download PDF',
    type: 'button',
    expectedBehavior: 'Starts mocked download and shows instant feedback.',
    status: 'Working',
    fixNotes: 'Toast confirms download start.'
  },
  {
    id: 'wallet-drawer-update',
    page: 'Documents drawer',
    label: 'Request update',
    type: 'button',
    expectedBehavior: 'Opens reason modal and logs request after submit.',
    status: 'Working',
    fixNotes: 'Adds recent check style event.'
  },
  {
    id: 'wallet-rights-open-card',
    page: 'Documents (/wallet)',
    label: 'Open Civic Card',
    type: 'link',
    expectedBehavior: 'Navigates to Civic Card.',
    status: 'Working',
    fixNotes: 'Route is /civic-card.'
  },
  {
    id: 'civic-generate-qr',
    page: 'Civic Card',
    label: 'Generate new QR',
    type: 'button',
    expectedBehavior: 'Rotates token, resets countdown, updates issue timestamp.',
    status: 'Working',
    fixNotes: 'Logs verification event.'
  },
  {
    id: 'civic-share-proof',
    page: 'Civic Card',
    label: 'Share proof',
    type: 'button',
    expectedBehavior: 'Copies verify link and logs audit trail entry.',
    status: 'Working',
    fixNotes: 'Clipboard fallback handled.'
  },
  {
    id: 'civic-big-screen',
    page: 'Civic Card',
    label: 'Show in big screen',
    type: 'button',
    expectedBehavior: 'Opens fullscreen-style modal with enlarged QR.',
    status: 'Working',
    fixNotes: 'Esc or overlay click closes.'
  },
  {
    id: 'civic-authority-demo',
    page: 'Civic Card',
    label: 'Start authority check demo',
    type: 'button',
    expectedBehavior: 'Navigates to split-screen authority check flow.',
    status: 'Working',
    fixNotes: 'Route is /authority-check.'
  },
  {
    id: 'authority-scan',
    page: 'Authority Check',
    label: 'Scan QR',
    type: 'button',
    expectedBehavior: 'Simulates verification and updates audit + notifications + timeline.',
    status: 'Working',
    fixNotes: 'Supports valid/invalid branches.'
  },
  {
    id: 'authority-expired-token',
    page: 'Authority Check',
    label: 'Simulate expired token',
    type: 'button',
    expectedBehavior: 'Forces invalid result and guidance to generate new proof.',
    status: 'Working',
    fixNotes: 'Updates result card state.'
  },
  {
    id: 'services-open-details',
    page: 'Services',
    label: 'Service card open',
    type: 'link',
    expectedBehavior: 'Navigates to /services/[slug] with full details.',
    status: 'Working',
    fixNotes: 'All catalog sections support open action.'
  },
  {
    id: 'services-start-request',
    page: 'Service Details',
    label: 'Start request',
    type: 'button',
    expectedBehavior: 'Opens multi-step request wizard and saves created request.',
    status: 'Working',
    fixNotes: 'Writes to timeline, notifications, and inbox.'
  },
  {
    id: 'timeline-open-request',
    page: 'Timeline',
    label: 'Open details',
    type: 'link',
    expectedBehavior: 'Opens request details with stepper/actions.',
    status: 'Working',
    fixNotes: 'Route /timeline/[requestId].'
  },
  {
    id: 'timeline-add-doc',
    page: 'Request details',
    label: 'Add missing document',
    type: 'button',
    expectedBehavior: 'Opens attachment modal and posts to authority thread.',
    status: 'Working',
    fixNotes: 'Redirects to linked inbox thread after submit.'
  },
  {
    id: 'timeline-withdraw',
    page: 'Request details',
    label: 'Withdraw request',
    type: 'button',
    expectedBehavior: 'Changes request status and logs timeline/notification updates.',
    status: 'Working',
    fixNotes: 'Uses request withdrawal store action.'
  },
  {
    id: 'timeline-demo-status',
    page: 'Request details (Demo)',
    label: 'Apply status',
    type: 'button',
    expectedBehavior: 'Changes request status in demo controls panel.',
    status: 'Working',
    fixNotes: 'Persists across refresh.'
  },
  {
    id: 'inbox-open-thread',
    page: 'Inbox',
    label: 'Thread item',
    type: 'button',
    expectedBehavior: 'Opens selected thread and marks it read.',
    status: 'Working',
    fixNotes: 'Unread badge updates.'
  },
  {
    id: 'inbox-send-reply',
    page: 'Inbox',
    label: 'Submit reply',
    type: 'button',
    expectedBehavior: 'Sends citizen message and updates thread state.',
    status: 'Working',
    fixNotes: 'Supports optional vault attachment.'
  },
  {
    id: 'appointments-book',
    page: 'Appointments',
    label: 'Book appointment',
    type: 'button',
    expectedBehavior: 'Opens booking modal and creates appointment on confirm.',
    status: 'Working',
    fixNotes: 'Pushes notification and timeline item.'
  },
  {
    id: 'appointments-reschedule',
    page: 'Appointments',
    label: 'Reschedule',
    type: 'button',
    expectedBehavior: 'Opens reschedule flow and updates appointment time.',
    status: 'Working',
    fixNotes: 'Shows toast confirmation.'
  },
  {
    id: 'notifications-bell',
    page: 'Topbar',
    label: 'Bell icon',
    type: 'icon-button',
    expectedBehavior: 'Opens notification dropdown menu.',
    status: 'Working',
    fixNotes: 'Unread badge and pulse behavior active.'
  },
  {
    id: 'notifications-mark-all',
    page: 'Notifications',
    label: 'Mark all as read',
    type: 'button',
    expectedBehavior: 'Marks all notifications read in local state.',
    status: 'Working',
    fixNotes: 'Unread counter drops to zero.'
  },
  {
    id: 'settings-demo-toggle',
    page: 'Settings',
    label: 'Demo Mode toggle',
    type: 'input',
    expectedBehavior: 'Enables/disables demo data mode.',
    status: 'Working',
    fixNotes: 'Persists through demo store.'
  },
  {
    id: 'settings-reset-demo',
    page: 'Settings',
    label: 'Reset Demo',
    type: 'button',
    expectedBehavior: 'Resets persisted demo state and runtime state.',
    status: 'Working',
    fixNotes: 'Clears staged scenarios and derived changes.'
  },
  {
    id: 'settings-language',
    page: 'Settings/Topbar',
    label: 'Language selector',
    type: 'input',
    expectedBehavior: 'Changes full UI language, selector labels remain in English.',
    status: 'Working',
    fixNotes: 'Locale persisted in localStorage + URL lang param.'
  },
  {
    id: 'security-report',
    page: 'Security',
    label: 'Report suspicious activity',
    type: 'button',
    expectedBehavior: 'Opens report form modal and logs notification/audit on submit.',
    status: 'Working',
    fixNotes: 'Implemented as lightweight actionable flow.'
  },
  {
    id: 'demo-floating-open',
    page: 'Global Demo Layer',
    label: 'Floating DEMO button',
    type: 'icon-button',
    expectedBehavior: 'Opens demo controls panel.',
    status: 'Working',
    fixNotes: 'Visible only in Demo Mode.'
  },
  {
    id: 'demo-controls-qa-toggle',
    page: 'Global Demo Layer',
    label: 'Enable/Disable QA mode',
    type: 'button',
    expectedBehavior: 'Toggles QA outlines + click console.',
    status: 'Working',
    fixNotes: 'Persists in runtime store.'
  }
];

export function checklistSummary(items: InteractionChecklistItem[]) {
  const total = items.length;
  const working = items.filter((item) => item.status === 'Working').length;
  const broken = items.filter((item) => item.status === 'Broken').length;
  const missing = items.filter((item) => item.status === 'Missing').length;

  return { total, working, broken, missing };
}
