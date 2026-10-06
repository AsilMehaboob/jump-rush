export {};

declare global {
  interface Window {
    humanRunner?: {
      readStore(): Promise<unknown>;
      writeStore(data: unknown): Promise<boolean>;
      toggleFullscreen(): Promise<boolean>;
      quit(): Promise<void>;
    };
  }
}
