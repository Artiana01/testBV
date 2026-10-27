import { AppConfig } from '../config/types';
import shop1 from './shop1';
import saas1 from './saas1';
import vitrine1 from './vitrine1';

// Registry - add new apps here
export const apps: Record<string, AppConfig> = {
  shop1,
  saas1,
  vitrine1,
};

export function getApp(key: string): AppConfig {
  const app = apps[key];
  if (!app) throw new Error(`App "${key}" not found. Register it in apps/index.ts`);
  return app;
}
