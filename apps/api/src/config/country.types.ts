export type ProcessConfig = {
  id: string;
  name: string;
  category: 'business' | 'immigration' | 'tax';
  eligibilitySummary: string;
  steps: string[];
  requiredDocuments: string[];
  estimatedDays: number;
};

export type CountryConfig = {
  id: string;
  name: string;
  languages: string[];
  agencies: Record<string, string>;
  processes: ProcessConfig[];
};
