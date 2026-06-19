/// <reference types="vite/client" />

import type { CarloApi } from '../../preload/api';

declare global {
  interface Window {
    api: CarloApi;
  }
}
