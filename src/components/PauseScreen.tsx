import { controller } from '../app/GameController';
import type { AppSnapshot } from '../app/AppStore';
import { ArcadeButton } from './ArcadeButton';

export function PauseScreen({ app }: { app: AppSnapshot }) {
  if (app.pauseReason === 'player-lost') {
    return (
      <div className="screen screen-overlay">
        <h2 className="heading warn">PLAYER NOT DETECTED</h2>
        <p className="lead">Move into the camera view.</p>
        <p className="lead dim">The game resumes automatically.</p>
        <ArcadeButton variant="ghost" onClick={() => controller.quitToMenu()}>[ QUIT ]</ArcadeButton>
      </div>
    );
  }
  return (
    <div className="screen screen-overlay">
      <h2 className="heading">PAUSED</h2>
      <div className="btn-row">
        <ArcadeButton autoFocus onClick={() => controller.resumeGame()}>[ RESUME ]</ArcadeButton>
        <ArcadeButton variant="ghost" onClick={() => controller.restart()}>[ RESTART ]</ArcadeButton>
        <ArcadeButton variant="ghost" onClick={() => controller.quitToMenu()}>[ QUIT ]</ArcadeButton>
      </div>
    </div>
  );
}
