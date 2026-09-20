import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type Lang = 'en' | 'tr';

const STORAGE_KEY = 'lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);

  readonly lang = signal<Lang>(this.initialLang());

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.document.documentElement.lang = lang;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // storage unavailable (private mode etc.) — ignore
      }
    });
  }

  set(lang: Lang): void {
    this.lang.set(lang);
  }

  toggle(): void {
    this.lang.update((l) => (l === 'en' ? 'tr' : 'en'));
  }

  private initialLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'tr') return stored;
    } catch {
      // ignore
    }
    const browser = this.document.defaultView?.navigator.language ?? 'en';
    return browser.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }
}
