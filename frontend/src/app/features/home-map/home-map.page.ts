import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Dev {
  name: string;
  type: string;
  status: boolean;
  xPct: number; // posizione % sinistra
  yPct: number; // posizione % dall’alto
}

@Component({
  selector: 'app-home-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-map.page.html',
  styleUrls: ['./home-map.page.css']
})
export class HomeMapPage {
  isCollapsed = false;

  homeStatus = {
    lightsOn: 3,
    temperature: 22,
    energyKwh: 4.5,
    camerasOn: 2
  };

  devices: Dev[] = [
    { name: 'Luce Soggiorno', type: 'light', status: true,  xPct: 70, yPct: 20 },
    { name: 'Luce Cucina',    type: 'light', status: true,  xPct: 85, yPct: 22 },
    { name: 'Clima Camera',   type: 'clima', status: false, xPct: 30, yPct: 60 },
    { name: 'Serranda Garage',type: 'garage', status: true, xPct: 92, yPct: 55 },
    { name: 'Telecamera Garage', type: 'camera', status: true, xPct: 86, yPct: 55 },
    { name: 'Telecamera Portone', type: 'camera', status: true, xPct: 50, yPct: 85 }
  ];

  toggleDevice(dev: Dev) {
    dev.status = !dev.status;
  }

  iconFor(type: string): string {
    switch (type) {
      case 'light': return '💡';
      case 'clima': return '❄️';
      case 'camera': return '📹';
      case 'garage': return '🛗'; // icona serranda
      default: return '⚙️';
    }
  }
}
