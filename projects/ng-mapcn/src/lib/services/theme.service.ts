import { Injectable, signal, effect } from '@angular/core';
import { ThemeConfig, ThemeMode } from '../models';

/**
 * Service for managing theme (light/dark mode)
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'ng-mapcn-theme';
  private config: ThemeConfig = {};
  
  /** Current theme signal */
  public readonly theme = signal<'light' | 'dark'>('light');
  
  constructor() {
    // Initialize theme
    this.initializeTheme();
    
    // Watch for system preference changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.config.mode === 'auto') {
          this.applyTheme(this.getSystemTheme());
        }
      });
    }
    
    // Apply theme when signal changes
    effect(() => {
      const currentTheme = this.theme();
      this.applyThemeToDocument(currentTheme);
      
      if (this.config.onThemeChange) {
        this.config.onThemeChange(currentTheme);
      }
    });
  }
  
  /**
   * Initialize theme service with configuration
   */
  initialize(config?: ThemeConfig): void {
    this.config = {
      detectSystemPreference: true,
      storageKey: this.storageKey,
      ...config
    };
    
    this.initializeTheme();
  }
  
  /**
   * Get current theme
   */
  getTheme(): 'light' | 'dark' {
    return this.theme();
  }
  
  /**
   * Set theme
   */
  setTheme(mode: ThemeMode): void {
    let newTheme: 'light' | 'dark';
    
    if (mode === 'auto') {
      newTheme = this.getSystemTheme();
    } else {
      newTheme = mode;
    }
    
    this.config.mode = mode;
    this.theme.set(newTheme);
    
    // Persist to storage if configured
    if (this.config.storageKey && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.config.storageKey, mode);
    }
  }
  
  /**
   * Toggle between light and dark theme
   */
  toggleTheme(): void {
    const current = this.theme();
    const newTheme = current === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }
  
  /**
   * Get system theme preference
   */
  private getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'light';
    }
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  /**
   * Initialize theme from storage or system preference
   */
  private initializeTheme(): void {
    let mode: ThemeMode = 'auto';
    
    if (this.config.storageKey && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        mode = stored as ThemeMode;
      }
    }
    
    if (this.config.mode) {
      mode = this.config.mode;
    }
    
    this.setTheme(mode);
  }
  
  /**
   * Apply theme to document
   */
  private applyThemeToDocument(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') {
      return;
    }
    
    const html = document.documentElement;
    
    html.classList.remove('theme-light', 'theme-dark', 'dark');
    html.removeAttribute('data-theme');
    
    if (theme === 'dark') {
      html.classList.add('theme-dark', 'dark');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.add('theme-light');
      html.setAttribute('data-theme', 'light');
    }
  }
  
  /**
   * Apply theme (internal method)
   */
  private applyTheme(theme: 'light' | 'dark'): void {
    this.theme.set(theme);
  }
}
