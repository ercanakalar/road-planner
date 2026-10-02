import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'privacy' },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy').then((m) => m.Privacy),
  },
  {
    path: 'share/:token',
    loadComponent: () => import('./pages/open-in-app/open-in-app').then((m) => m.OpenInApp),
  },
  {
    path: 'route/:id',
    loadComponent: () => import('./pages/open-in-app/open-in-app').then((m) => m.OpenInApp),
  },
  { path: '**', redirectTo: 'privacy' },
];
