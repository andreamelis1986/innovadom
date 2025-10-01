import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  standalone: true,
  imports: [MatCardModule],
  template: `<mat-card><mat-card-title>Impostazioni</mat-card-title></mat-card>`,
})
export class SettingsPage {}
