import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="grid">
      <mat-card><mat-card-title>Benvenuto</mat-card-title>
        <mat-card-content>Qui vedrai lo stato della casa.</mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));}`]
})
export class DashboardPage {}
