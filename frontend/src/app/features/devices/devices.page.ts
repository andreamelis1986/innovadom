import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [
    CommonModule,
    NgFor,
    NgIf,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSliderModule
  ],
  templateUrl: './devices.page.html',
  styleUrls: ['./devices.page.css']
})
export class DevicesPage implements OnInit {
  devicesSvc = inject(DeviceService);

  ngOnInit() {
    this.devicesSvc.refreshDevices();   // ✅ carica e aggiorna subito
    this.devicesSvc.connectWebSocket(); // ✅ live updates
  }

  toggleDevice(id: number) {
    this.devicesSvc.toggleDevice(id);
  }

  setPosition(id: number, value: number) {
    this.devicesSvc.setShutterPosition(id, value);
  }

}
