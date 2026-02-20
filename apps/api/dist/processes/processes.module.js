"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessesModule = void 0;
const common_1 = require("@nestjs/common");
const processes_controller_1 = require("./processes.controller");
const processes_service_1 = require("./processes.service");
const config_module_1 = require("../config/config.module");
const audit_module_1 = require("../audit/audit.module");
let ProcessesModule = class ProcessesModule {
};
exports.ProcessesModule = ProcessesModule;
exports.ProcessesModule = ProcessesModule = __decorate([
    (0, common_1.Module)({
        imports: [config_module_1.ConfigModule, audit_module_1.AuditModule],
        controllers: [processes_controller_1.ProcessesController],
        providers: [processes_service_1.ProcessesService]
    })
], ProcessesModule);
