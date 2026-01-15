/**
 * Theme mode options
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Configuration for theme management
 */
export interface ThemeConfig {
  /** Current theme mode */
  mode?: ThemeMode;
  
  /** Whether to detect system preference */
  detectSystemPreference?: boolean;
  
  /** Storage key for persisting theme preference */
  storageKey?: string;
  
  /** Callback when theme changes */
  onThemeChange?: (theme: 'light' | 'dark') => void;
}
