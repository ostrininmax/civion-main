"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("./roles.decorator");
let RolesGuard = class RolesGuard {
    canActivate(context) {
        const handlerRoles = Reflect.getMetadata(roles_decorator_1.ROLES_KEY, context.getHandler());
        const classRoles = Reflect.getMetadata(roles_decorator_1.ROLES_KEY, context.getClass());
        const requiredRoles = handlerRoles ?? classRoles;
        if (!requiredRoles || requiredRoles.length === 0)
            return true;
        const request = context.switchToHttp().getRequest();
        const role = (request.headers['x-role'] ?? '').toString().toLowerCase();
        return requiredRoles.includes(role);
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)()
], RolesGuard);
