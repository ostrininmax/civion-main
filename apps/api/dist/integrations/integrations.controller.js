"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/roles.decorator");
let IntegrationsController = class IntegrationsController {
    getOverview() {
        return {
            status: 'demo-ready',
            endpoints: [
                { name: 'Registry lookup', path: '/registry/mock' },
                { name: 'Consent check', path: '/consent/mock' },
                { name: 'Audit log', path: '/audit' }
            ]
        };
    }
    mockRegistry() {
        return {
            registry: 'Companies Registry',
            response: {
                companyId: 'CY-123456',
                status: 'active',
                lastUpdated: new Date().toISOString()
            }
        };
    }
    mockConsent() {
        return {
            consentId: 'consent_demo_01',
            scope: ['passport', 'proof_of_address'],
            status: 'granted'
        };
    }
    health() {
        return {
            services: [
                { name: 'Identity Service', status: 'ok' },
                { name: 'Registry Gateway', status: 'ok' },
                { name: 'Audit Ledger', status: 'ok' }
            ]
        };
    }
};
exports.IntegrationsController = IntegrationsController;
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('registry/mock'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "mockRegistry", null);
__decorate([
    (0, common_1.Get)('consent/mock'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "mockConsent", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "health", null);
exports.IntegrationsController = IntegrationsController = __decorate([
    (0, common_1.Controller)('integrations'),
    (0, roles_decorator_1.RequireRoles)('admin')
], IntegrationsController);
