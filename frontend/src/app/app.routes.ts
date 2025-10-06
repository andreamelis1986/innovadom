import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { EmptyLayoutComponent } from './layouts/empty-layout/empty-layout.component';
import { VideocameraPage } from './features/videocamera/videocamera.page';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./features/home-map/home-map.page').then(m => m.HomeMapPage) },
  { path: 'videocamera', loadComponent: () => import('./features/videocamera/videocamera.page').then(m => m.VideocameraPage) },
];
