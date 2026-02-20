import { AuthorityCheckClient } from '../../components/demo/AuthorityCheckClient';

export default function AuthorityCheckPage({
  searchParams
}: {
  searchParams?: { mode?: string | string[]; autoScan?: string | string[]; fullscreen?: string | string[] };
}) {
  const modeRaw = Array.isArray(searchParams?.mode) ? searchParams?.mode[0] : searchParams?.mode;
  const autoScanRaw = Array.isArray(searchParams?.autoScan) ? searchParams?.autoScan[0] : searchParams?.autoScan;
  const fullscreenRaw = Array.isArray(searchParams?.fullscreen) ? searchParams?.fullscreen[0] : searchParams?.fullscreen;

  const mode = modeRaw === 'border' ? 'border' : 'police';

  return (
    <AuthorityCheckClient
      mode={mode}
      autoScan={autoScanRaw === '1'}
      openFullscreenByDefault={fullscreenRaw === '1'}
    />
  );
}
