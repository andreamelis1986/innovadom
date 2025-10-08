import { Component, OnInit, inject, PLATFORM_ID, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule, NgFor, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '../../services/device.service';
import { Device } from '../../models/device.model';

@Component({
  selector: 'app-device-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor],
  templateUrl: './device-manager.page.html',
  styleUrls: ['./device-manager.page.css'],
  encapsulation: ViewEncapsulation.None
})
export class DeviceManagerPage implements OnInit {
  private deviceService = inject(DeviceService);
  private platformId = inject(PLATFORM_ID);

  devices = signal<Device[]>([]);
  newDevice: Device = { name: '', type: 'light', ip: '', status: 'off', top: 0, left: 0 };
  showAddForm = false;
successMessage = '';

  stats = [
    { label: 'Totali', value: 0, perc: 0, desc: 'Dispositivi registrati' },
    { label: 'Online', value: 0, perc: 0, desc: 'Dispositivi accesi' },
    { label: 'Offline', value: 0, perc: 0, desc: 'Dispositivi spenti' },
    { label: 'Luci', value: 0, perc: 0, desc: 'Luci gestite' }
  ];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadDevicesAndStats(); // ✅ usa la nuova funzione
    }
  }

  updateStats() {
    const devs = this.devices();
    const total = devs.length;
    const online = devs.filter(d => d.status === 'on').length;
    const lights = devs.filter(d => d.type === 'light').length;

    this.stats = [
      { label: 'Totali', value: total, perc: total * 10, desc: 'Dispositivi registrati' },
      { label: 'Online', value: online, perc: online * 10, desc: 'Dispositivi accesi' },
      { label: 'Offline', value: total - online, perc: (total - online) * 10, desc: 'Dispositivi spenti' },
      { label: 'Luci', value: lights, perc: lights * 10, desc: 'Luci gestite' }
    ];
  }

  toggleDevice(device: Device) {
    device.status = device.status === 'on' ? 'off' : 'on';
    this.deviceService.updateDeviceStatus(device.id!, device.status);
    this.updateStats();
  }

  addDevice() {
    if (!this.newDevice.name || !this.newDevice.ip) return;

    this.deviceService.addDevice(this.newDevice).subscribe({
      next: () => {
  this.successMessage = '✅ Dispositivo aggiunto con successo!';
  setTimeout(() => (this.successMessage = ''), 2000);

  this.loadDevicesAndStats();
  this.showAddForm = false;
  this.newDevice = { name: '', type: 'light', ip: '', status: 'off', top: 0, left: 0 };
},
      error: (err: unknown) => console.error('❌ Errore aggiunta dispositivo:', err)
    });
  }


  deleteDevice(id: number) {
    this.deviceService.deleteDevice(id);
    this.devices.update(devices => devices.filter(d => d.id !== id));
    this.updateStats();
  }

  openAddDeviceForm() {
    this.showAddForm = true;
  }

  closeAddDeviceForm() {
    this.showAddForm = false;
  }

  Math = Math;

  // ✅ Selezione posizione cliccando sulla mappa
  selectPosition(event: MouseEvent) {
    const mapElement = event.currentTarget as HTMLElement;
    const rect = mapElement.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

    this.newDevice.left = parseFloat(xPercent.toFixed(2));
    this.newDevice.top = parseFloat(yPercent.toFixed(2));

    console.log(`📍 Posizione selezionata: top=${this.newDevice.top}%, left=${this.newDevice.left}%`);
  }

  loadDevicesAndStats() {
    this.deviceService.loadDevicesFromDB().subscribe({
      next: (data: Device[]) => {
        this.devices.set(data);
        this.updateStats();
      },
      error: (err: unknown) => console.error('❌ Errore ricaricamento devices:', err)
    });
  }

}
