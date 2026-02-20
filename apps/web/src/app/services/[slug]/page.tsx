import { ServiceDetails } from '../../../components/services/ServiceDetails';

export default function ServiceDetailsPage({ params }: { params: { slug: string } }) {
  return <ServiceDetails slug={params.slug} />;
}
