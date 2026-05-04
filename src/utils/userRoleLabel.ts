import type { UserRole } from '../types/api';

const ROLE_LABELS: Record<UserRole, string> = {
  ROLE_ADMIN: 'Admin',
  ROLE_GM: 'Dungeon Master',
  ROLE_PLAYER: 'Player',
  ROLE_VIEWER: 'Viewer',
};

const formatRoleFallback = (role: string) =>
  role
    .replace(/^ROLE_/, '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');

export const getUserRoleLabel = (role: UserRole | string | null | undefined) => {
  if (!role) {
    return 'Ospite';
  }

  return ROLE_LABELS[role as UserRole] ?? formatRoleFallback(role);
};

export const getPrimaryUserRoleLabel = (roles: (UserRole | string)[] | null | undefined) => {
  if (!roles?.length) {
    return 'Ospite';
  }

  const priority: UserRole[] = ['ROLE_ADMIN', 'ROLE_GM', 'ROLE_PLAYER', 'ROLE_VIEWER'];
  const match = priority.find((role) => roles.includes(role));

  return getUserRoleLabel(match ?? roles[0]);
};
