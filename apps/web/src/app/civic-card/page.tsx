import { CivicCardPageClient } from '../../components/civic-card/CivicCardPageClient';
import { generateCivicCardToken, getWalletDocuments, type CivicCardTokenResponse } from '../../lib/api';

const fallbackToken = (): CivicCardTokenResponse => {
  const issuedAt = new Date().toISOString();
  return {
    token: `fallback.${Date.now()}`,
    issuedAt,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    scopes: ['student_discount', 'trp_valid', 'transport_concession']
  };
};

export default async function CivicCardPage({
  searchParams
}: {
  searchParams?: { big?: string | string[] };
}) {
  const bigParam = Array.isArray(searchParams?.big) ? searchParams?.big[0] : searchParams?.big;
  const openBigScreenByDefault = bigParam === '1';

  const [documents, tokenData] = await Promise.all([getWalletDocuments(), generateCivicCardToken()]);
  const initialToken = tokenData ?? fallbackToken();

  return (
    <CivicCardPageClient
      documents={documents}
      initialToken={initialToken}
      openBigScreenByDefault={openBigScreenByDefault}
    />
  );
}
