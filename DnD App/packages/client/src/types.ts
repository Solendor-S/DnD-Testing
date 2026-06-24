import type { SrdApi, CharApi } from '../electron/preload';

declare global {
  interface Window {
    srdApi: SrdApi;
    charApi: CharApi;
  }
}

export {};
