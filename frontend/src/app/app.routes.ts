import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent, // Layout principale
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home-map/home-map.page').then((m) => m.HomeMapPage),
      },
      {
        path: 'devices',
        loadComponent: () =>
          import('./features/devices/devices.page').then((m) => m.DevicesPage),
      },
      {
        path: 'gestione',
        loadComponent: () => import('./features/device-manager/device-manager.page')
          .then(m => m.DeviceManagerPage)
      },
      {
        path: 'videocamera',
        loadComponent: () =>
          import('./features/videocamera/videocamera.page').then((m) => m.VideocameraPage),
      },
    ],
  },
  // fallback
  { path: '**', redirectTo: 'home' },
];
