import { WifiOff } from '@carbon/icons-react';
import { useOnlineStatus } from '../lib/use-online-status';
import { ICON_SIZE } from './icon';

export function OfflineBanner({ message }: { message: string }) {
  const online = useOnlineStatus();

  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="flex items-center gap-2 border-b border-warning bg-warning-subtle px-safe py-2 text-body-sm text-text lg:px-8">
          <WifiOff size={ICON_SIZE.inline} aria-hidden className="shrink-0 text-warning" />
          {message}
        </p>
      )}
    </div>
  );
}
