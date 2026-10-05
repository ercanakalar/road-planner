import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'privacy' },
  {
    path: 'privacy',
    title: 'Travel Routes — Privacy Policy / Gizlilik Politikası',
    loadComponent: () => import('./pages/privacy/privacy').then((m) => m.Privacy),
  },
  { path: '**', redirectTo: 'privacy' },
];
