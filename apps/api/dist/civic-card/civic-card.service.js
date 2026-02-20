"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CivicCardService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const DEFAULT_SCOPES = ['student_discount', 'trp_valid', 'transport_concession'];
const TOKEN_TTL_MS = 5 * 60 * 1000;
let CivicCardService = class CivicCardService {
    signingSecret = process.env.CIVIC_CARD_SIGNING_SECRET ?? 'civic-card-demo-secret';
    issueToken(scopes = DEFAULT_SCOPES) {
        const issuedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
        const payload = {
            jti: (0, node_crypto_1.randomUUID)(),
            issuedAt,
            expiresAt,
            scopes,
            status: 'eligible',
            issuer: 'University of Cyprus / Migration Department'
        };
        const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
        const signature = this.sign(encodedPayload);
        return {
            token: `${encodedPayload}.${signature}`,
            issuedAt,
            expiresAt,
            scopes: payload.scopes
        };
    }
    verifyToken(token) {
        if (!token) {
            return { valid: false, reason: 'missing_token' };
        }
        const parts = token.split('.');
        if (parts.length !== 2) {
            return { valid: false, reason: 'invalid_format' };
        }
        const [encodedPayload, signature] = parts;
        const expectedSignature = this.sign(encodedPayload);
        const hasValidSignature = signature.length === expectedSignature.length &&
            (0, node_crypto_1.timingSafeEqual)(Buffer.from(signature), Buffer.from(expectedSignature));
        if (!hasValidSignature) {
            return { valid: false, reason: 'invalid_signature' };
        }
        let payload;
        try {
            payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        }
        catch {
            return { valid: false, reason: 'malformed_payload' };
        }
        const hasRequiredFields = typeof payload.issuedAt === 'string' &&
            typeof payload.expiresAt === 'string' &&
            typeof payload.issuer === 'string' &&
            (payload.status === 'eligible' || payload.status === 'not_eligible') &&
            Array.isArray(payload.scopes);
        if (!hasRequiredFields) {
            return { valid: false, reason: 'malformed_payload' };
        }
        const expired = new Date(payload.expiresAt).getTime() <= Date.now();
        if (expired) {
            return {
                valid: false,
                reason: 'expired',
                issuedAt: payload.issuedAt,
                expiresAt: payload.expiresAt,
                issuer: payload.issuer,
                status: payload.status,
                scopes: payload.scopes
            };
        }
        return {
            valid: true,
            issuedAt: payload.issuedAt,
            expiresAt: payload.expiresAt,
            issuer: payload.issuer,
            status: payload.status,
            scopes: payload.scopes,
            attributes: {
                studentDiscount: payload.scopes.includes('student_discount'),
                temporaryResidencePermitValid: payload.scopes.includes('trp_valid'),
                transportConcession: payload.scopes.includes('transport_concession')
            }
        };
    }
    sign(encodedPayload) {
        return (0, node_crypto_1.createHmac)('sha256', this.signingSecret).update(encodedPayload).digest('base64url');
    }
};
exports.CivicCardService = CivicCardService;
exports.CivicCardService = CivicCardService = __decorate([
    (0, common_1.Injectable)()
], CivicCardService);
