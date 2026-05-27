export const NotificationType = {
  TicketCreatedApprover: 'ticket_created_approver',
  TicketStatusChangedRequester: 'ticket_status_changed_requester',
  TicketCompleted: 'ticket_completed',
  OnboardingErrorReported: 'onboarding_error_reported',
  ManualEntryCreated: 'manual_entry_created',
  InviteCodeDelivered: 'invite_code_delivered',
  InviteCodeRegenerated: 'invite_code_regenerated',
  WelcomeEmployee: 'welcome_employee',
  ProfileChangedSensitive: 'profile_changed_sensitive',
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

export const TEMPLATE_CODE_MAP: Record<NotificationTypeValue, string> = {
  ticket_created_approver: 'TicketCreatedApprover',
  ticket_status_changed_requester: 'TicketStatusChangedRequester',
  ticket_completed: 'TicketCompleted',
  onboarding_error_reported: 'OnboardingErrorReported',
  manual_entry_created: 'ManualEntryCreated',
  invite_code_delivered: 'InviteCodeDelivered',
  invite_code_regenerated: 'InviteCodeRegenerated',
  welcome_employee: 'WelcomeEmployee',
  profile_changed_sensitive: 'ProfileChangedSensitive',
};
