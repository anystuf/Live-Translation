import type { ConnectionStatus } from '../lib/types';

const LABELS: Record<ConnectionStatus, string> = {
  idle: 'Idle',
  'requesting-token': 'Authorising',
  connecting: 'Connecting',
  live: 'Live',
  reconnecting: 'Reconnecting',
  stopped: 'Stopped',
  error: 'Error',
};

export function StatusPill({
  status,
  detail,
}: {
  status: ConnectionStatus;
  detail?: string;
}) {
  return (
    <div className={`status-pill status-${status}`} role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      <span className="status-label">{LABELS[status]}</span>
      {detail ? <span className="status-detail">{detail}</span> : null}
    </div>
  );
}
