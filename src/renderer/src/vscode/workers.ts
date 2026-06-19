import { configureDefaultWorkerFactory } from 'monaco-languageclient/workerFactory';

export function configureWorkers(): void {
  configureDefaultWorkerFactory();
}
