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
exports.CivicCardController = void 0;
const common_1 = require("@nestjs/common");
const civic_card_service_1 = require("./civic-card.service");
let CivicCardController = class CivicCardController {
    civicCard;
    constructor(civicCard) {
        this.civicCard = civicCard;
    }
    issueToken(body) {
        const scopes = Array.isArray(body?.scopes) && body?.scopes.length > 0 ? body.scopes : undefined;
        return this.civicCard.issueToken(scopes);
    }
    verifyToken(token) {
        return this.civicCard.verifyToken(token);
    }
};
exports.CivicCardController = CivicCardController;
__decorate([
    (0, common_1.Post)('token'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CivicCardController.prototype, "issueToken", null);
__decorate([
    (0, common_1.Get)('verify'),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CivicCardController.prototype, "verifyToken", null);
exports.CivicCardController = CivicCardController = __decorate([
    (0, common_1.Controller)('civic-card'),
    __param(0, (0, common_1.Inject)(civic_card_service_1.CivicCardService)),
    __metadata("design:paramtypes", [civic_card_service_1.CivicCardService])
], CivicCardController);
