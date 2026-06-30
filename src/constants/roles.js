// Admin roles (spec 10.1) and the module/action permission matrix (spec 10.2).
// Permissions are enforced on the BACKEND, never trusted from the frontend (spec 12.2).

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OPERATIONS_MANAGER: 'operations_manager',
  CASE_MANAGER: 'case_manager',
  SALES_EXECUTIVE: 'sales_executive',
  LEGAL_EXECUTIVE: 'legal_executive',
  FIELD_AGENT: 'field_agent',
  DOCUMENT_EXECUTIVE: 'document_executive',
  SUPPORT_EXECUTIVE: 'support_executive',
  FINANCE_EXECUTIVE: 'finance_executive',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.OPERATIONS_MANAGER]: 'Operations Manager',
  [ROLES.CASE_MANAGER]: 'Case Manager',
  [ROLES.SALES_EXECUTIVE]: 'Sales Executive',
  [ROLES.LEGAL_EXECUTIVE]: 'Legal Executive',
  [ROLES.FIELD_AGENT]: 'Field Agent',
  [ROLES.DOCUMENT_EXECUTIVE]: 'Document Executive',
  [ROLES.SUPPORT_EXECUTIVE]: 'Support Executive',
  [ROLES.FINANCE_EXECUTIVE]: 'Finance Executive',
};

// Permission strings are `module:action`. '*' is the wildcard reserved for Super Admin.
// Modules mirror the admin screen master list (spec 7.1).
export const PERMISSIONS = {
  // Unified Enquiry Center
  ENQUIRY_VIEW_ALL: 'enquiry:view_all',
  ENQUIRY_VIEW_ASSIGNED: 'enquiry:view_assigned',
  ENQUIRY_CREATE: 'enquiry:create',
  ENQUIRY_UPDATE: 'enquiry:update',
  ENQUIRY_ASSIGN: 'enquiry:assign',
  ENQUIRY_CONVERT: 'enquiry:convert',

  // Cases
  CASE_VIEW_ALL: 'case:view_all',
  CASE_VIEW_ASSIGNED: 'case:view_assigned',
  CASE_UPDATE: 'case:update',
  CASE_ASSIGN: 'case:assign',

  // Documents
  DOCUMENT_VIEW: 'document:view',
  DOCUMENT_UPLOAD: 'document:upload',
  DOCUMENT_VERIFY: 'document:verify',

  // Field operations & reports
  FIELD_VIEW: 'field:view',
  FIELD_UPLOAD_REPORT: 'field:upload_report',
  FIELD_PUBLISH_REPORT: 'field:publish_report',

  // Projects & growth
  PROJECT_VIEW: 'project:view',
  PROJECT_MANAGE: 'project:manage',
  JD_VIEW: 'jd:view',
  JD_MANAGE: 'jd:manage',

  // Users & team
  USER_VIEW: 'user:view',
  USER_MANAGE: 'user:manage',
  TEAM_VIEW: 'team:view',
  TEAM_MANAGE: 'team:manage',

  // Messaging
  MESSAGE_VIEW: 'message:view',
  MESSAGE_SEND: 'message:send',

  // Notifications
  NOTIFICATION_VIEW: 'notification:view',
  NOTIFICATION_SEND: 'notification:send',

  // Payments
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_CHANGE_STATUS: 'payment:change_status',

  // Settings, services config, audit
  SETTINGS_MANAGE: 'settings:manage',
  SERVICE_MANAGE: 'service:manage',
  AUDIT_VIEW: 'audit:view',

  // Hard delete is restricted; archive/close is preferred (spec 10.2)
  RECORD_DELETE: 'record:delete',
};

const P = PERMISSIONS;

// Default permission set per role. Stored on each TeamMember at creation,
// but can be customised later (permissions are configured at module/action level).
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['*'],

  [ROLES.OPERATIONS_MANAGER]: [
    P.ENQUIRY_VIEW_ALL, P.ENQUIRY_CREATE, P.ENQUIRY_UPDATE, P.ENQUIRY_ASSIGN, P.ENQUIRY_CONVERT,
    P.CASE_VIEW_ALL, P.CASE_UPDATE, P.CASE_ASSIGN,
    P.DOCUMENT_VIEW, P.DOCUMENT_UPLOAD, P.DOCUMENT_VERIFY,
    P.FIELD_VIEW, P.FIELD_PUBLISH_REPORT,
    P.PROJECT_VIEW, P.PROJECT_MANAGE, P.JD_VIEW, P.JD_MANAGE,
    P.USER_VIEW, P.USER_MANAGE, P.TEAM_VIEW,
    P.MESSAGE_VIEW, P.MESSAGE_SEND,
    P.NOTIFICATION_VIEW, P.NOTIFICATION_SEND,
    P.PAYMENT_VIEW,
    P.AUDIT_VIEW,
  ],

  [ROLES.CASE_MANAGER]: [
    P.ENQUIRY_VIEW_ASSIGNED, P.ENQUIRY_UPDATE,
    P.CASE_VIEW_ASSIGNED, P.CASE_UPDATE,
    P.DOCUMENT_VIEW, P.DOCUMENT_UPLOAD,
    P.FIELD_VIEW,
    P.MESSAGE_VIEW, P.MESSAGE_SEND,
    P.USER_VIEW,
  ],

  [ROLES.SALES_EXECUTIVE]: [
    P.ENQUIRY_VIEW_ASSIGNED, P.ENQUIRY_UPDATE, P.ENQUIRY_CONVERT,
    P.PROJECT_VIEW, P.JD_VIEW, P.JD_MANAGE,
    P.MESSAGE_VIEW, P.MESSAGE_SEND,
    P.USER_VIEW,
  ],

  [ROLES.LEGAL_EXECUTIVE]: [
    P.CASE_VIEW_ASSIGNED, P.CASE_UPDATE,
    P.DOCUMENT_VIEW, P.DOCUMENT_UPLOAD, P.DOCUMENT_VERIFY,
    P.MESSAGE_VIEW, P.MESSAGE_SEND,
  ],

  [ROLES.FIELD_AGENT]: [
    P.CASE_VIEW_ASSIGNED,
    P.FIELD_VIEW, P.FIELD_UPLOAD_REPORT,
    P.DOCUMENT_UPLOAD,
  ],

  [ROLES.DOCUMENT_EXECUTIVE]: [
    P.CASE_VIEW_ASSIGNED,
    P.DOCUMENT_VIEW, P.DOCUMENT_UPLOAD, P.DOCUMENT_VERIFY,
  ],

  [ROLES.SUPPORT_EXECUTIVE]: [
    P.ENQUIRY_VIEW_ASSIGNED, P.ENQUIRY_UPDATE,
    P.MESSAGE_VIEW, P.MESSAGE_SEND,
    P.USER_VIEW,
  ],

  [ROLES.FINANCE_EXECUTIVE]: [
    P.PAYMENT_VIEW, P.PAYMENT_CHANGE_STATUS,
    P.CASE_VIEW_ALL,
  ],
};

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : [];
}

export function hasPermission(permissions = [], required) {
  if (permissions.includes('*')) return true;
  return permissions.includes(required);
}
