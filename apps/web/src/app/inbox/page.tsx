import { InboxThreads } from '../../components/inbox/InboxThreads';

export default function InboxPage({ searchParams }: { searchParams?: { thread?: string | string[] } }) {
  const threadParam = searchParams?.thread;
  const initialThreadId = Array.isArray(threadParam) ? threadParam[0] : threadParam;
  return <InboxThreads initialThreadId={initialThreadId} />;
}
