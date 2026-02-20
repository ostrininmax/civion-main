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
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const wallet_service_1 = require("./wallet.service");
let WalletController = class WalletController {
    wallet;
    constructor(wallet) {
        this.wallet = wallet;
    }
    async listDocuments() {
        return this.wallet.list();
    }
    async uploadDocument(body) {
        return this.wallet.upload(body);
    }
    async deleteDocument(id) {
        return this.wallet.softDelete(id);
    }
    async shareDocument(id, body) {
        return this.wallet.createShareLink(id, body.ttlHours ?? 24, body.role ?? 'advisor');
    }
    accessLog(id) {
        return this.wallet.listAccessLog(id);
    }
    async accessShare(shareId, actor) {
        return this.wallet.accessShare(shareId, actor ?? 'external-user');
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)('documents'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Post)('documents'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "deleteDocument", null);
__decorate([
    (0, common_1.Post)('documents/:id/share'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "shareDocument", null);
__decorate([
    (0, common_1.Get)('documents/:id/access-log'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WalletController.prototype, "accessLog", null);
__decorate([
    (0, common_1.Get)('share/:shareId'),
    __param(0, (0, common_1.Param)('shareId')),
    __param(1, (0, common_1.Query)('actor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "accessShare", null);
exports.WalletController = WalletController = __decorate([
    (0, common_1.Controller)('wallet'),
    __param(0, (0, common_1.Inject)(wallet_service_1.WalletService)),
    __metadata("design:paramtypes", [wallet_service_1.WalletService])
], WalletController);
