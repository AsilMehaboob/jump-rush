import { controller } from '../app/GameController';
import type { AppSnapshot } from '../app/AppStore';
import { ArcadeButton } from './ArcadeButton';
import { pad6 } from '../utils/math';

export function GameOverScreen({ app }: { app: AppSnapshot }) {
  return (
    <div className="screen screen-overlay">
      <h2 className="heading danger">GAME OVER</h2>
      {app.newBest && <p className="lead gold blink">NEW HIGH SCORE!</p>}
      <div className="score-block">
        <span className="label">SCORE</span>
        <span className="value big">{pad6(app.score)}</span>
        <span className="label">BEST</span>
        <span className="value">{pad6(app.best)}</span>
      </div>
      <ArcadeButton autoFocus onClick={() => controller.restart()}>[ PLAY AGAIN ]</ArcadeButton>
      {app.canRestartByJump && <p className="lead dim blink">or jump to play again</p>}
      <ArcadeButton variant="ghost" onClick={() => controller.quitToMenu()}>[ MENU ]</ArcadeButton>
    </div>
  );
}
