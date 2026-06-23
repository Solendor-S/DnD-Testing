import type { SrdApi } from '../electron/preload';

declare global {
  interface Window {
    srdApi: SrdApi;
  }
}

export {};
