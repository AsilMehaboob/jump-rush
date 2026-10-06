import type { AppSnapshot } from '../app/AppStore';

export function CalibrationScreen({ app }: { app: AppSnapshot }) {
  const blocks = 20;
  const filled = Math.round(app.calibrationProgress * blocks);
  return (
    <div className="screen screen-calibration">
      {app.playerDetected ? (
        <>
          <h2 className="heading">STAND IN FRAME</h2>
          <p className="lead">Make sure your entire body is visible.</p>
        </>
      ) : (
        <>
          <h2 className="heading warn">PLAYER NOT DETECTED</h2>
          <p className="lead">Please step into the camera view.</p>
        </>
      )}
      <div className="progress" role="progressbar" aria-valuenow={Math.round(app.calibrationProgress * 100)}>
        {Array.from({ length: blocks }, (_, i) => <i key={i} className={i < filled ? 'on' : ''} />)}
      </div>
      <p className="lead blink">CALIBRATING...</p>
    </div>
  );
}
