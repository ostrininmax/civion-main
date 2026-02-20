"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentModule = void 0;
const common_1 = require("@nestjs/common");
const consent_controller_1 = require("./consent.controller");
const consent_service_1 = require("./consent.service");
const audit_module_1 = require("../audit/audit.module");
let ConsentModule = class ConsentModule {
};
exports.ConsentModule = ConsentModule;
exports.ConsentModule = ConsentModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule],
        controllers: [consent_controller_1.ConsentController],
        providers: [consent_service_1.ConsentService]
    })
], ConsentModule);
