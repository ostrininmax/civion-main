import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type {
  CivicCardScope,
  CivicCardTokenPayload,
  CivicCardTokenResponse,
  CivicCardVerificationResponse
} from './civic-card.types';

const DEFAULT_SCOPES: CivicCardScope[] = ['student_discount', 'trp_valid', 'transport_concession'];
const TOKEN_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class CivicCardService {
  private readonly signingSecret = process.env.CIVIC_CARD_SIGNING_SECRET ?? 'civic-card-demo-secret';

  issueToken(scopes = DEFAULT_SCOPES): CivicCardTokenResponse {
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    const payload: CivicCardTokenPayload = {
      jti: randomUUID(),
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

  verifyToken(token?: string): CivicCardVerificationResponse {
    if (!token) {
      return { valid: false, reason: 'missing_token' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: 'invalid_format' };
    }

    const [encodedPayload, signature] = parts;
    const expectedSignature = this.sign(encodedPayload);
    const hasValidSignature =
      signature.length === expectedSignature.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

    if (!hasValidSignature) {
      return { valid: false, reason: 'invalid_signature' };
    }

    let payload: CivicCardTokenPayload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as CivicCardTokenPayload;
    } catch {
      return { valid: false, reason: 'malformed_payload' };
    }

    const hasRequiredFields =
      typeof payload.issuedAt === 'string' &&
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

  private sign(encodedPayload: string) {
    return createHmac('sha256', this.signingSecret).update(encodedPayload).digest('base64url');
  }
}
