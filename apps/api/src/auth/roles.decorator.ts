import { SetMetadata } from '@nestjs/common';
import type { Role } from './roles';

export const ROLES_KEY = 'roles';
export const RequireRoles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
