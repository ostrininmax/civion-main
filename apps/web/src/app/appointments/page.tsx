import { AppointmentBooking } from '../../components/appointments/AppointmentBooking';

export default function AppointmentsPage({
  searchParams
}: {
  searchParams?: { book?: string | string[]; requestId?: string | string[] };
}) {
  const book = Array.isArray(searchParams?.book) ? searchParams?.book[0] : searchParams?.book;
  const requestId = Array.isArray(searchParams?.requestId) ? searchParams?.requestId[0] : searchParams?.requestId;

  return <AppointmentBooking autoOpenBook={book === '1'} requestId={requestId} />;
}
