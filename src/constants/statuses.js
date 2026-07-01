// Status systems and enumerations from spec sections 6 and 9.

// Enquiry types (spec 4.2 / 6.2)
export const ENQUIRY_TYPES = [
  'service', 'project', 'joint_development', 'support', 'callback', 'referral', 'document_review',
];

// Enquiry sources (spec 6.1) - where the enquiry originated
export const ENQUIRY_SOURCES = [
  'user_service_request', 'project_interest', 'joint_development',
  'support', 'callback', 'referral', 'document_review', 'admin_manual',
];

// Enquiry status lifecycle (spec 6.3)
export const ENQUIRY_STATUSES = [
  'new', 'assigned', 'contacted', 'awaiting_details', 'qualified',
  'converted', 'closed_not_interested', 'closed_duplicate', 'spam_invalid',
];

// Allowed transitions for enquiry status (spec 6.3 "Allowed Next Actions")
export const ENQUIRY_STATUS_TRANSITIONS = {
  new: ['assigned', 'contacted', 'spam_invalid', 'closed_not_interested'],
  assigned: ['contacted', 'awaiting_details', 'qualified', 'closed_not_interested', 'spam_invalid'],
  contacted: ['awaiting_details', 'qualified', 'converted', 'closed_not_interested'],
  awaiting_details: ['contacted', 'qualified', 'closed_not_interested'],
  qualified: ['converted', 'closed_not_interested'],
  converted: [],
  closed_not_interested: ['new', 'assigned'],
  closed_duplicate: [],
  spam_invalid: [],
};

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export const USER_TYPES = ['nrk', 'kp', 'landowner', 'buyer_investor', 'guest'];

export const KYC_STATUSES = ['not_submitted', 'pending', 'verified', 'rejected'];

export const ACCOUNT_STATUSES = ['active', 'blocked'];

// Case statuses (spec 9.2)
export const CASE_STATUSES = [
  'submitted', 'under_review', 'awaiting_user', 'assigned', 'in_progress',
  'field_visit_scheduled', 'report_under_review', 'report_ready',
  'payment_pending', 'completed', 'cancelled', 'closed',
];

// Document statuses (spec 9.3)
export const DOCUMENT_STATUSES = [
  'pending_review', 'verified_clean', 'discrepancy_found',
  'action_required', 'rejected', 're_upload_requested',
];

// Document categories (spec 7.8)
export const DOCUMENT_CATEGORIES = [
  'jamabandi', 'girdawari', 'fard', 'mutation', 'poa',
  'sale_agreement', 'id_proof', 'site_plan', 'encumbrance_certificate', 'other',
];

export const PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid', 'failed', 'refunded'];

export const RISK_RATINGS = ['low', 'medium', 'high'];

export const REPORT_APPROVAL_STATUSES = ['draft', 'under_review', 'approved', 'published', 'rejected'];

export const PROJECT_STATUSES = ['ongoing', 'upcoming', 'completed'];

export const JD_PIPELINE_STAGES = [
  'new', 'contacted', 'docs_requested', 'feasibility_review',
  'site_visit', 'proposal', 'negotiation', 'converted', 'closed',
];

export const NOTIFICATION_CHANNELS = ['push', 'email', 'in_app'];

export const DOCUMENT_VISIBILITY = ['private', 'user_visible'];

// Allowed case status transitions (spec 9.2)
export const CASE_STATUS_TRANSITIONS = {
  submitted: ['under_review', 'cancelled'],
  under_review: ['awaiting_user', 'assigned', 'cancelled'],
  awaiting_user: ['under_review', 'assigned'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['field_visit_scheduled', 'report_under_review', 'awaiting_user', 'payment_pending', 'completed', 'cancelled'],
  field_visit_scheduled: ['report_under_review', 'in_progress', 'cancelled'],
  report_under_review: ['report_ready', 'in_progress'],
  report_ready: ['payment_pending', 'completed'],
  payment_pending: ['completed', 'in_progress'],
  completed: [],
  cancelled: [],
  closed: [],
};
