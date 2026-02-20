import { VerifyPageClient } from '../../components/civic-card/VerifyPageClient';
import { verifyCivicCardToken } from '../../lib/api';

export default async function VerifyPage({
  searchParams
}: {
  searchParams?: { token?: string | string[] };
}) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token : '';
  const verification = token ? await verifyCivicCardToken(token) : null;
  return <VerifyPageClient token={token} verification={verification} />;
}
