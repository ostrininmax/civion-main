export type WalletDocument = {
  id: string;
  category: string;
  filename: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  metadata?: {
    documentNumber?: string;
    fullName?: string;
    dateOfBirth?: string;
    nationality?: string;
    scanConfidence?: number;
    source?: 'camera_ocr' | 'manual' | 'government_registry';
  };
  version: number;
  status: 'active' | 'deleted';
};

export type WalletShareLink = {
  shareId: string;
  documentId: string;
  url: string;
  expiresAt: string;
  role: 'advisor' | 'admin';
};

export type WalletShareAccess = {
  id: string;
  shareId: string;
  documentId: string;
  actor: string;
  action: 'created' | 'accessed';
  at: string;
};
