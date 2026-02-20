export type BenefitPassScope = 'student_discount' | 'trp_valid' | 'transport_concession';

export type BenefitPassTokenResponse = {
  token: string;
  issuedAt: string;
  expiresAt: string;
  scopes: BenefitPassScope[];
};

export type BenefitPassVerificationResponse = {
  valid: boolean;
  reason?: 'missing_token' | 'invalid_format' | 'invalid_signature' | 'expired' | 'malformed_payload';
  issuedAt?: string;
  expiresAt?: string;
  issuer?: string;
  status?: 'eligible' | 'not_eligible';
  scopes?: BenefitPassScope[];
  attributes?: {
    studentDiscount: boolean;
    temporaryResidencePermitValid: boolean;
    transportConcession: boolean;
  };
};

type TokenPayload = {
  iat: number;
  exp: number;
  iss: string;
  status: 'eligible' | 'not_eligible';
  scopes: BenefitPassScope[];
  docType: string;
};

const SECRET = 'civic-demo-secret-v1';

function toBase64Url(input: string) {
  let encoded = '';
  if (typeof globalThis.btoa === 'function') {
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    for (const value of bytes) binary += String.fromCharCode(value);
    encoded = globalThis.btoa(binary);
  } else {
    encoded = Buffer.from(input, 'utf-8').toString('base64');
  }
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(normalized, 'base64').toString('utf-8');
}

function simpleHash(input: string) {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

function sign(input: string) {
  return simpleHash(`${input}.${SECRET}`);
}

export function createBenefitPassToken(input?: {
  scopes?: BenefitPassScope[];
  ttlSeconds?: number;
  status?: 'eligible' | 'not_eligible';
  issuer?: string;
  docType?: string;
}): BenefitPassTokenResponse {
  const issuedAtMs = Date.now();
  const ttlSeconds = Math.max(30, input?.ttlSeconds ?? 120);
  const payload: TokenPayload = {
    iat: Math.floor(issuedAtMs / 1000),
    exp: Math.floor((issuedAtMs + ttlSeconds * 1000) / 1000),
    iss: input?.issuer ?? 'University of Cyprus / Migration Department',
    status: input?.status ?? 'eligible',
    scopes: input?.scopes ?? ['student_discount', 'trp_valid'],
    docType: input?.docType ?? 'BenefitPass'
  };

  const header = { alg: 'HS256', typ: 'JWT', kid: 'demo-1' };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const body = `${encodedHeader}.${encodedPayload}`;

  return {
    token: `${body}.${sign(body)}`,
    issuedAt: new Date(payload.iat * 1000).toISOString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    scopes: payload.scopes
  };
}

export function verifyBenefitPassToken(token: string): BenefitPassVerificationResponse {
  if (!token) {
    return { valid: false, reason: 'missing_token' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'invalid_format' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signedBody = `${encodedHeader}.${encodedPayload}`;
  if (sign(signedBody) !== signature) {
    return { valid: false, reason: 'invalid_signature' };
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.exp || payload.exp <= now) {
      return {
        valid: false,
        reason: 'expired',
        issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : undefined,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
        issuer: payload.iss,
        status: payload.status,
        scopes: payload.scopes ?? []
      };
    }

    const scopes = payload.scopes ?? [];

    return {
      valid: true,
      issuedAt: new Date(payload.iat * 1000).toISOString(),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      issuer: payload.iss,
      status: payload.status,
      scopes,
      attributes: {
        studentDiscount: scopes.includes('student_discount'),
        temporaryResidencePermitValid: scopes.includes('trp_valid'),
        transportConcession: scopes.includes('transport_concession')
      }
    };
  } catch {
    return { valid: false, reason: 'malformed_payload' };
  }
}
