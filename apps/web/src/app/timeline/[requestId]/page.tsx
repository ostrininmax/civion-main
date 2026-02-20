import { RequestDetails } from '../../../components/requests/RequestDetails';

export default function RequestDetailsPage({ params }: { params: { requestId: string } }) {
  return <RequestDetails requestId={params.requestId} />;
}
