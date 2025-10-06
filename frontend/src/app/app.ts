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
      <router-outlet />
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
