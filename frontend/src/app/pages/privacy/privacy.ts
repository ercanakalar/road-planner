import { Component, inject } from '@angular/core';
import { Lang, LanguageService } from '../../core/language.service';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.html',
  host: { class: 'block' },
})
export class Privacy {
  private readonly language = inject(LanguageService);

  protected readonly lang = this.language.lang;
  protected readonly languages: { code: Lang; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'tr', label: 'Türkçe' },
  ];

  protected setLang(lang: Lang): void {
    this.language.set(lang);
  }
}
