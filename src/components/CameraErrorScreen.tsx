import { controller } from '../app/GameController';
import type { AppSnapshot } from '../app/AppStore';
import { APP_CONFIG } from '../config/appConfig';
import { ArcadeButton } from './ArcadeButton';

const COPY: Record<string, [string, string]> = {
  disconnected: ['CAMERA DISCONNECTED', 'Please reconnect the camera.'],
  permission: ['CAMERA ACCESS DENIED', 'Allow camera access, then retry.'],
  'not-found': ['NO CAMERA FOUND', 'Please connect a camera.'],
  'in-use': ['CAMERA UNAVAILABLE', 'Close other apps using the camera.'],
  unknown: ['CAMERA ERROR', 'Something went wrong starting the camera.'],
};

export function CameraErrorScreen({ app }: { app: AppSnapshot }) {
  const [title, text] = COPY[app.cameraError ?? 'unknown'];
  return (
    <div className="screen screen-overlay">
      <h2 className="heading warn">{title}</h2>
      <p className="lead">{text}</p>
      <ArcadeButton autoFocus onClick={() => void controller.retryCamera()}>[ RETRY ]</ArcadeButton>
      <ArcadeButton variant="ghost" onClick={() => controller.quitToMenu()}>[ MENU ]</ArcadeButton>
      {app.debug && APP_CONFIG.keyboardFallback && (
        <ArcadeButton variant="ghost" onClick={() => controller.startKeyboardOnly()}>[ KEYBOARD MODE (DEV) ]</ArcadeButton>
      )}
    </div>
  );
}
