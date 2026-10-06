import { controller } from '../app/GameController';
import type { AppSnapshot } from '../app/AppStore';
import { APP_CONFIG } from '../config/appConfig';
import { ArcadeButton } from './ArcadeButton';
import { pad6 } from '../utils/math';

export function StartScreen({ app }: { app: AppSnapshot }) {
  return (
    <div className="screen screen-menu">
      <h1 className="title">{APP_CONFIG.title}</h1>
      <p className="lead">Stand in front of the camera.</p>
      <p className="lead">Jump to control the character.</p>
      <ArcadeButton autoFocus onClick={() => void controller.startGame()}>[ START GAME ]</ArcadeButton>
      <div className="hiscore">
        <span className="label">HIGH SCORE</span>
        <span className="value">{pad6(app.best)}</span>
      </div>
      {app.debug && APP_CONFIG.keyboardFallback && (
        <p className="dev-hint">DEV: ENTER=START  K=KEYBOARD MODE  SPACE=JUMP  ESC=PAUSE  R=RESTART  F3=DEBUG</p>
      )}
    </div>
  );
}
