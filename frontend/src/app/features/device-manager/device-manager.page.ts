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
  encapsulation: ViewEncapsulation.None // ✅ disattiva isolamento CSS globale
})
export class DeviceManagerPage implements OnInit {
  // ✅ Iniezioni
  private deviceService = inject(DeviceService);
  private platformId = inject(PLATFORM_ID);

  // ✅ Signal con tipizzazione
  devices = signal<Device[]>([]);

  // ✅ Nuovo dispositivo di default
  newDevice: Device = { name: '', type: 'light', ip: '', status: 'off', top: 0, left: 0 };

  // ✅ Stato modale
  showAddForm = false;

  // ✅ Statistiche
  stats = [
    { label: 'Totali', value: 0, perc: 0, desc: 'Dispositivi registrati' },
    { label: 'Online', value: 0, perc: 0, desc: 'Dispositivi accesi' },
    { label: 'Offline', value: 0, perc: 0, desc: 'Dispositivi spenti' },
    { label: 'Luci', value: 0, perc: 0, desc: 'Luci gestite' }
  ];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.deviceService.loadDevicesFromDB();
      setTimeout(() => this.updateStats(), 1000);
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
      next: (device: Device) => {
        // ✅ Evita duplicati e aggiunge con mutate()
        if (!this.devices().some(d => d.id === device.id)) {
          this.devices.mutate((devices: Device[]) => devices.push(device));
        }

        // ✅ Reset form
        this.newDevice = {
          name: '',
          type: 'light',
          ip: '',
          status: 'off',
          top: 0,
          left: 0
        };

        this.showAddForm = false;
      },
      error: (err: any) => console.error('Errore aggiunta dispositivo:', err)
    });
  }

  deleteDevice(id: number) {
    this.deviceService.deleteDevice(id);
    setTimeout(() => this.updateStats(), 500);
  }

  openAddDeviceForm() {
    this.showAddForm = true;
  }

  closeAddDeviceForm() {
    this.showAddForm = false;
  }

  // ✅ Serve per usare Math in HTML
  Math = Math;

  // ✅ Gestione click sulla mappa per posizione
  selectPosition(event: MouseEvent) {
    const mapElement = event.currentTarget as HTMLElement;
    const rect = mapElement.getBoundingClientRect();

    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

    this.newDevice.left = parseFloat(xPercent.toFixed(2));
    this.newDevice.top = parseFloat(yPercent.toFixed(2));

    console.log(`Posizione selezionata: top=${this.newDevice.top}%, left=${this.newDevice.left}%`);
  }
}
