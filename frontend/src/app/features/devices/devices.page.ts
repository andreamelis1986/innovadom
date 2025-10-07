import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { DeviceService } from '../../services/device.service';

@Component({
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    FormsModule,       // 👈 per [(ngModel)]
    MatCardModule,
    MatButtonModule,
    MatSliderModule
  ],
  template: `
    <h2>Dispositivi</h2>
    <div class="grid">

<mat-card *ngFor="let d of devicesSvc.devices()">
  <mat-card-title>{{ d.name }}</mat-card-title>
  <mat-card-content>
    Stato: {{ d.status }}

    <div *ngIf="d.type === 'shutter'">
      <p>Posizione: {{ d.position ?? 0 }}%</p>
      <mat-slider min="0" max="100" step="1">
        <input matSliderThumb [(ngModel)]="d.position"
               (ngModelChange)="devicesSvc.setPosition(d.id!, $event)">
      </mat-slider>
    </div>
  </mat-card-content>

  <button *ngIf="d.type === 'light'"
          mat-raised-button color="primary"
          (click)="devicesSvc.toggleDevice(d.id!)">
    {{ d.status === 'on' ? 'Spegni' : 'Accendi' }}
  </button>
</mat-card>


    </div>
  `,
  styles: [`
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
    mat-slider {
      width: 100%;
      margin-top: 8px;
    }
  `]
})
export class DevicesPage implements OnInit {
  devicesSvc = inject(DeviceService);

  ngOnInit() {
    this.devicesSvc.loadDevicesFromDB();      // carica dal backend
    this.devicesSvc.connectWebSocket(); // ascolta aggiornamenti live
  }
}
