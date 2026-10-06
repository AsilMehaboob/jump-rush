// Copies MediaPipe WASM runtime into public/ and downloads the pose model once (build-time only).
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const wasmSrc = 'node_modules/@mediapipe/tasks-vision/wasm';
if (existsSync(wasmSrc)) {
  mkdirSync('public/mediapipe/wasm', { recursive: true });
  cpSync(wasmSrc, 'public/mediapipe/wasm', { recursive: true });
}
const model = 'public/models/pose_landmarker.task';
if (!existsSync(model)) {
  const url = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    mkdirSync(dirname(model), { recursive: true });
    writeFileSync(model, Buffer.from(await res.arrayBuffer()));
    console.log('Downloaded pose model');
  } catch (e) {
    console.warn('Could not download pose model; place pose_landmarker.task in public/models/', e);
  }
}
