import { controller } from '../app/GameController';
import type { AppSnapshot } from '../app/AppStore';

export function SettingsBar({ app }: { app: AppSnapshot }) {
  const cameraOn = !app.keyboardOnly && app.state !== 'MENU' && app.state !== 'CAMERA_ERROR' && app.state !== 'CAMERA_SETUP';
  return (
    <div className={`settings ${app.state === 'PLAYING' ? 'settings-dim' : ''}`}>
      {cameraOn && app.devices.length > 1 && app.state !== 'PLAYING' && (
        <select
          aria-label="Camera"
          value={app.cameraId ?? ''}
          onChange={(e) => void controller.selectCamera(e.target.value)}
        >
          {app.devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      )}
      {cameraOn && <button onClick={() => controller.togglePreview()}>CAM:{app.showPreview ? 'ON' : 'OFF'}</button>}
      <button onClick={() => controller.toggleMute()}>SND:{app.muted ? 'OFF' : 'ON'}</button>
      <button onClick={() => void controller.toggleFullscreen()}>FULL</button>
      {app.state === 'PLAYING' && <button onClick={() => controller.pauseGame('user')}>PAUSE</button>}
    </div>
  );
}
