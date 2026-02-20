export type CivicCardScope = 'student_discount' | 'trp_valid' | 'transport_concession';

export type CivicCardTokenPayload = {
  jti: string;
  issuedAt: string;
  expiresAt: string;
  scopes: CivicCardScope[];
  status: 'eligible' | 'not_eligible';
  issuer: string;
};

export type CivicCardTokenResponse = {
  token: string;
  issuedAt: string;
  expiresAt: string;
  scopes: CivicCardScope[];
};

export type CivicCardVerificationResponse = {
  valid: boolean;
  reason?: 'missing_token' | 'invalid_format' | 'invalid_signature' | 'expired' | 'malformed_payload';
  issuedAt?: string;
  expiresAt?: string;
  issuer?: string;
  status?: 'eligible' | 'not_eligible';
  scopes?: CivicCardScope[];
  attributes?: {
    studentDiscount: boolean;
    temporaryResidencePermitValid: boolean;
    transportConcession: boolean;
  };
};
