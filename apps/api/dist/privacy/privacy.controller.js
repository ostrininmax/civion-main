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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyController = void 0;
const common_1 = require("@nestjs/common");
const privacy_service_1 = require("./privacy.service");
let PrivacyController = class PrivacyController {
    privacy;
    constructor(privacy) {
        this.privacy = privacy;
    }
    async exportData() {
        return this.privacy.exportData();
    }
    async requestDeletion(body) {
        return this.privacy.requestDeletion(body.reason);
    }
};
exports.PrivacyController = PrivacyController;
__decorate([
    (0, common_1.Get)('export'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PrivacyController.prototype, "exportData", null);
__decorate([
    (0, common_1.Post)('delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PrivacyController.prototype, "requestDeletion", null);
exports.PrivacyController = PrivacyController = __decorate([
    (0, common_1.Controller)('privacy'),
    __param(0, (0, common_1.Inject)(privacy_service_1.PrivacyService)),
    __metadata("design:paramtypes", [privacy_service_1.PrivacyService])
], PrivacyController);
