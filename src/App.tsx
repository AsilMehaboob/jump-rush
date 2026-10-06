import { useEffect } from 'react';
import { controller } from './app/GameController';
import { APP_CONFIG } from './config/appConfig';
import { useAppState } from './hooks/useAppState';
import { GameCanvas } from './components/GameCanvas';
import { StartScreen } from './components/StartScreen';
import { CameraSetupScreen } from './components/CameraSetupScreen';
import { CalibrationScreen } from './components/CalibrationScreen';
import { Countdown } from './components/Countdown';
import { PauseScreen } from './components/PauseScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { CameraErrorScreen } from './components/CameraErrorScreen';
import { CameraPreview } from './components/CameraPreview';
import { SettingsBar } from './components/SettingsBar';
import { DebugOverlay } from './components/DebugOverlay';

export function App() {
  const app = useAppState();

  useEffect(() => {
    void controller.boot();
    window.addEventListener('keydown', controller.handleKey);
    return () => window.removeEventListener('keydown', controller.handleKey);
  }, []);

  const camState = ['CALIBRATION', 'COUNTDOWN', 'PLAYING', 'PAUSED', 'GAME_OVER'].includes(app.state) && !app.keyboardOnly;
  const largePreview = app.state === 'CALIBRATION';
  const showPreview = camState && (largePreview || app.showPreview || app.debug);

  return (
    <div className="stage">
      {app.state !== 'BOOT' && <GameCanvas />}
      <div className="ui">
        {app.state === 'MENU' && <StartScreen app={app} />}
        {app.state === 'CAMERA_SETUP' && <CameraSetupScreen />}
        {app.state === 'CALIBRATION' && <CalibrationScreen app={app} />}
        {app.state === 'COUNTDOWN' && <Countdown label={app.countdown} />}
        {app.state === 'PAUSED' && <PauseScreen app={app} />}
        {app.state === 'GAME_OVER' && <GameOverScreen app={app} />}
        {app.state === 'CAMERA_ERROR' && <CameraErrorScreen app={app} />}
        {showPreview && <CameraPreview large={largePreview} debug={app.debug} />}
        {app.state !== 'BOOT' && <SettingsBar app={app} />}
        {app.debug && <DebugOverlay />}
      </div>
      {APP_CONFIG.crtEffect && <div className="crt" aria-hidden />}
    </div>
  );
}
