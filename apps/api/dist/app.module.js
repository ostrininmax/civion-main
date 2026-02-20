"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const health_module_1 = require("./health/health.module");
const wallet_module_1 = require("./wallet/wallet.module");
const processes_module_1 = require("./processes/processes.module");
const timeline_module_1 = require("./timeline/timeline.module");
const ai_module_1 = require("./ai/ai.module");
const integrations_module_1 = require("./integrations/integrations.module");
const auth_module_1 = require("./auth/auth.module");
const audit_module_1 = require("./audit/audit.module");
const config_module_1 = require("./config/config.module");
const prisma_module_1 = require("./db/prisma.module");
const consent_module_1 = require("./consent/consent.module");
const privacy_module_1 = require("./privacy/privacy.module");
const demo_module_1 = require("./demo/demo.module");
const civic_card_module_1 = require("./civic-card/civic-card.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            demo_module_1.DemoModule,
            civic_card_module_1.CivicCardModule,
            config_module_1.ConfigModule,
            auth_module_1.AuthModule,
            audit_module_1.AuditModule,
            health_module_1.HealthModule,
            wallet_module_1.WalletModule,
            processes_module_1.ProcessesModule,
            timeline_module_1.TimelineModule,
            ai_module_1.AiModule,
            integrations_module_1.IntegrationsModule,
            consent_module_1.ConsentModule,
            privacy_module_1.PrivacyModule
        ]
    })
], AppModule);
