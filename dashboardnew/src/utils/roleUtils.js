export const isSuperAdmin = (role) =>
  role === 'supperadmin' || role === 'superadmin';

/** Roles that receive notifications (all staff; end-user `user` excluded). */
export const NOTIFICATION_RECIPIENT_ROLES = [
  'supperadmin',
  'superadmin',
  'admin',
  'white',
  'super',
  'master',
  'agent',
];

export const canAccessNotifications = (role) =>
  NOTIFICATION_RECIPIENT_ROLES.includes(role);

/** Staff roles that can filter reports by downline client username. */
export const hasClientSearchAccess = (role) =>
  NOTIFICATION_RECIPIENT_ROLES.includes(role);
