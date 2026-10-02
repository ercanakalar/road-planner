import { Component, computed, inject, input } from '@angular/core';
import { Lang, LanguageService } from '../../core/language.service';

// The app's own scheme; Android hands these links to it when installed.
const APP_SCHEME = 'net.travelroutes.travelroutes';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=net.travelroutes.travelroutes';

const COPY: Record<Lang, { title: string; body: string; open: string; get: string }> = {
  en: {
    title: 'This route opens in Travel Routes',
    body: 'Someone shared a route with you, or one you follow has just been published. Open it in the app to see its stops on the map.',
    open: 'Open in the app',
    get: 'Get Travel Routes on Google Play',
  },
  tr: {
    title: 'Bu rota Travel Routes uygulamasında açılır',
    body: 'Biri sizinle bir rota paylaştı ya da takip ettiğiniz biri yeni bir rota yayımladı. Duraklarını haritada görmek için rotayı uygulamada açın.',
    open: 'Uygulamada aç',
    get: 'Travel Routes’u Google Play’den indirin',
  },
};

// Where a route link lands on a phone that does not have the app, or in a
// desktop browser: the route itself is only shown in the app.
@Component({
  selector: 'app-open-in-app',
  templateUrl: './open-in-app.html',
  host: { class: 'block' },
})
export class OpenInApp {
  private readonly language = inject(LanguageService);

  // Bound from the route: /share/:token or /route/:id.
  readonly token = input<string>();
  readonly id = input<string>();

  protected readonly copy = computed(() => COPY[this.language.lang()]);
  protected readonly playStoreUrl = PLAY_STORE_URL;

  protected readonly appLink = computed(() => {
    const token = this.token();
    if (token) return `${APP_SCHEME}://share/${encodeURIComponent(token)}`;

    const id = this.id();
    return id ? `${APP_SCHEME}://route/${encodeURIComponent(id)}` : `${APP_SCHEME}://`;
  });
}
