import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="layout">
      <div class="main">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class MainLayoutComponent {}
