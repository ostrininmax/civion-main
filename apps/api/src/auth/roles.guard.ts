import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ROLES_KEY } from './roles.decorator';
import type { Role } from './roles';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const handlerRoles = Reflect.getMetadata(ROLES_KEY, context.getHandler()) as Role[] | undefined;
    const classRoles = Reflect.getMetadata(ROLES_KEY, context.getClass()) as Role[] | undefined;
    const requiredRoles = handlerRoles ?? classRoles;

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const role = (request.headers['x-role'] ?? '').toString().toLowerCase() as Role;
    return requiredRoles.includes(role);
  }
}
