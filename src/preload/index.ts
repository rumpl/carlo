import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', Object.freeze({ version: '0.1.0' }));
