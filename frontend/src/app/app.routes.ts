import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { EmptyLayoutComponent } from './layouts/empty-layout/empty-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage) },
      { path: 'devices', loadComponent: () => import('./features/devices/devices.page').then(m => m.DevicesPage) },
      { path: 'automations', loadComponent: () => import('./features/automations/automations.page').then(m => m.AutomationsPage) },
      { path: 'scenes', loadComponent: () => import('./features/scenes/scenes.page').then(m => m.ScenesPage) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.page').then(m => m.SettingsPage) },
    ]
  },
  {
    path: 'map',
    component: EmptyLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/home-map/home-map.page').then(m => m.HomeMapPage) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
