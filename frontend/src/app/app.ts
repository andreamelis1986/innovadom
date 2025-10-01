import { Component, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';   // 👈 aggiungi
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    CommonModule,  // 👈 aggiunto qui
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule, MatIconModule, MatButtonModule
  ],
  template: `
    <mat-sidenav-container class="app-container" *ngIf="!isMapRoute">
      <!-- layout con menu -->
      <mat-sidenav mode="side" opened class="app-sidenav">
        <div class="logo">Domus<span>Control</span></div>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active"><mat-icon>space_dashboard</mat-icon><span>Dashboard</span></a>
          <a mat-list-item routerLink="/devices" routerLinkActive="active"><mat-icon>devices_other</mat-icon><span>Dispositivi</span></a>
          <a mat-list-item routerLink="/automations" routerLinkActive="active"><mat-icon>bolt</mat-icon><span>Automazioni</span></a>
          <a mat-list-item routerLink="/scenes" routerLinkActive="active"><mat-icon>movie_filter</mat-icon><span>Scene</span></a>
          <a mat-list-item routerLink="/settings" routerLinkActive="active"><mat-icon>settings</mat-icon><span>Impostazioni</span></a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary">
          <span>{{title()}}</span>
          <span class="spacer"></span>
          <button mat-icon-button aria-label="Account">
            <mat-icon>account_circle</mat-icon>
          </button>
        </mat-toolbar>
        <div class="content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>

    <!-- Layout fullscreen per la mappa -->
    <div *ngIf="isMapRoute" class="map-fullscreen">
      <router-outlet />
    </div>
  `,
  styles: [`
    .app-container { height: 100vh; }
    .app-sidenav { width: 256px; }
    .logo { font-weight: 700; font-size: 1.1rem; padding: 16px; }
    .logo span { color: var(--mat-sys-primary); }
    .spacer { flex: 1 1 auto; }
    .content { padding: 16px; }
    a.active { background: color-mix(in oklab, var(--mat-sys-primary) 10%, transparent); }
    .map-fullscreen { height: 100vh; width: 100vw; overflow: hidden; }
  `]
})
export class AppComponent {
  title = signal('DomusControl');
  isMapRoute = false;

  constructor(private router: Router) {
    this.router.events.subscribe(() => {
      this.isMapRoute = this.router.url.startsWith('/map');
    });
  }
}
