import type { CountdownLabel } from '../app/AppStore';

export function Countdown({ label }: { label: CountdownLabel }) {
  if (!label) return null;
  return (
    <div className="screen screen-countdown">
      <div key={label} className={`count ${label === 'READY' ? 'count-ready' : ''} ${label === 'GO' ? 'count-go' : ''}`}>{label}</div>
    </div>
  );
}
