import { WalletDocumentsClient } from '../../components/wallet/WalletDocumentsClient';
import { getDocumentAccessLog, getWalletDocuments } from '../../lib/api';
import type { RecentCheck } from '../../lib/recent-checks';
import type { DocumentFilter } from '../../lib/wallet-rights';

function parseFilter(value?: string | string[]): DocumentFilter {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === 'expiring' || candidate === 'expired') return candidate;
  return 'all';
}

function parseDocumentId(value?: string | string[]) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;
  return candidate;
}

export default async function WalletPage({
  searchParams
}: {
  searchParams?: { filter?: string | string[]; doc?: string | string[] };
}) {
  const docs = await getWalletDocuments();
  const activeFilter = parseFilter(searchParams?.filter);
  const initialDocumentId = parseDocumentId(searchParams?.doc);

  const logsByDoc = await Promise.all(
    docs.map(async (doc) => ({
      docId: doc.id,
      entries: await getDocumentAccessLog(doc.id)
    }))
  );

  const initialChecks: RecentCheck[] = logsByDoc
    .flatMap((item) => item.entries)
    .map((entry) => ({
      id: `access-${entry.id}`,
      verifier: entry.actor,
      result: entry.action === 'accessed' ? 'Valid' : 'Valid',
      dataShown: 'Status + validity only',
      timestamp: entry.at,
      source: 'access_log' as const
    }));

  return (
    <WalletDocumentsClient
      initialDocuments={docs}
      initialFilter={activeFilter}
      initialChecks={initialChecks}
      initialDocumentId={initialDocumentId}
    />
  );
}
