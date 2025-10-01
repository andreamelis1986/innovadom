import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { DevicesService } from '../../services/devices.service';

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
          Stato: {{ d.state }}

          <!-- Se è una serranda mostro anche la % -->
          <div *ngIf="d.type === 'shutter'">
            <p>Posizione: {{ d.position ?? 0 }}%</p>

            <!-- Nuovo MDC slider -->
            <mat-slider min="0" max="100" step="1">
              <input matSliderThumb
                     [(ngModel)]="d.position"
                     (ngModelChange)="devicesSvc.setPosition(d.id, $event)">
            </mat-slider>
          </div>
        </mat-card-content>

        <!-- luci -->
        <button *ngIf="d.type === 'light'"
                mat-raised-button color="primary"
                (click)="devicesSvc.toggleDevice(d.id)">
          {{ d.state === 'on' ? 'Spegni' : 'Accendi' }}
        </button>

        <!-- serranda -->
        <div *ngIf="d.type === 'shutter'">
          <button mat-raised-button color="primary"
                  (click)="devicesSvc.toggleDevice(d.id, 'up')">Su</button>
          <button mat-raised-button color="accent"
                  (click)="devicesSvc.toggleDevice(d.id, 'down')">Giù</button>
          <button mat-raised-button color="warn"
                  (click)="devicesSvc.toggleDevice(d.id, 'stop')">Stop</button>
        </div>
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
  devicesSvc = inject(DevicesService);

  ngOnInit() {
    this.devicesSvc.loadDevices();      // carica dal backend
    this.devicesSvc.connectWebSocket(); // ascolta aggiornamenti live
  }
}
