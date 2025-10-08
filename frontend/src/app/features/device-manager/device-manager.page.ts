import { Component, OnInit, inject, PLATFORM_ID, ViewEncapsulation, signal } from '@angular/core';
import { CommonModule, NgFor, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '../../services/device.service';
import { Device } from '../../models/device.model';
import { ChangeDetectorRef, NgZone } from '@angular/core';

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
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  devices = signal<Device[]>([]);
  newDevice: Device = { name: '', type: 'light', ip: '', status: 'off', top: 0, left: 0 };
  showAddForm = false;
  successMessage = '';
  errorMessage = '';
  isAdding = false;
  confirmDeleteDevice: Device | null = null;

  stats = [
    { label: 'Totali', value: 0, perc: 0, desc: 'Dispositivi registrati' },
    { label: 'Online', value: 0, perc: 0, desc: 'Dispositivi accesi' },
    { label: 'Offline', value: 0, perc: 0, desc: 'Dispositivi spenti' },
    { label: 'Luci', value: 0, perc: 0, desc: 'Luci gestite' }
  ];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadDevicesAndStats();
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
  this.errorMessage = '';
  this.successMessage = '';

  const name = this.newDevice.name?.trim() ?? '';
  const ip = this.newDevice.ip?.trim() ?? '';

  if (!name || !ip) {
    this.errorMessage = '⚠️ Nome e indirizzo IP sono obbligatori.';
    return;
  }

  const ipRegex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  if (!ipRegex.test(ip)) {
    this.errorMessage = '❌ Indirizzo IP non valido.';
    return;
  }

  if (!this.newDevice.top || !this.newDevice.left) {
    this.errorMessage = '📍 Devi selezionare una posizione sulla mappa.';
    return;
  }

  const exists = this.devices().some(d => d.ip === ip);
  if (exists) {
    this.errorMessage = '❌ Questo indirizzo IP è già registrato.';
    return;
  }

  this.isAdding = true;
  console.log('🟢 Invio dispositivo:', this.newDevice);

  this.deviceService.addDevice(this.newDevice).subscribe({
    next: (created) => {
      console.log('📡 Risposta backend:', created);

      this.zone.run(() => {
        if ((created as any).error) {
          this.errorMessage = (created as any).error;
          this.isAdding = false;
          return;
        }

        this.devices.update(devices => [...devices, created]);
        this.updateStats();
        this.showAddForm = false;
        this.newDevice = { name: '', type: 'light', ip: '', status: 'off', top: 0, left: 0 };
        this.successMessage = '✅ Dispositivo aggiunto con successo!';
        this.isAdding = false;

        // ✅ Messaggio visibile per 5 secondi
        setTimeout(() => {
          this.zone.run(() => (this.successMessage = ''));
        }, 5000);
      });
    },
    error: (err) => {
      console.error('❌ Errore backend:', err);
      this.errorMessage = '❌ Errore durante l’aggiunta del dispositivo.';
      this.isAdding = false;
    }
  });
}

  // 🔹 Mostra modale di conferma
  openDeleteConfirm(device: Device) {
    this.confirmDeleteDevice = device;
  }

  // 🔹 Conferma eliminazione
  confirmDelete() {
    if (!this.confirmDeleteDevice) return;

    const id = this.confirmDeleteDevice.id!;
    const name = this.confirmDeleteDevice.name;

    this.deviceService.deleteDevice(id);
    this.devices.update(devices => devices.filter(d => d.id !== id));
    this.updateStats();

    this.successMessage = `🗑️ Dispositivo "${name}" eliminato con successo.`;
    this.confirmDeleteDevice = null;

    // ✅ Nasconde il messaggio dopo 5 secondi
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 5000);
  }


  // 🔹 Annulla eliminazione
  cancelDelete() {
    this.confirmDeleteDevice = null;
  }

  openAddDeviceForm() {
    this.showAddForm = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

  }

  closeAddDeviceForm() {
    this.showAddForm = false;
    this.errorMessage = '';
    this.cdr.detectChanges();

  }

  Math = Math;

  selectPosition(event: MouseEvent) {
    const mapElement = event.currentTarget as HTMLElement;
    const img = mapElement.querySelector('img') as HTMLImageElement;

    if (!img || !img.naturalWidth || !img.naturalHeight) {
      console.warn('⚠️ Immagine non ancora caricata o senza dimensioni valide');
      return;
    }

    const rect = img.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 🔹 Calcola le percentuali rispetto alla dimensione *naturale* dell’immagine
    const xPercent = (clickX / rect.width) * 100;
    const yPercent = (clickY / rect.height) * 100;

    this.newDevice.left = parseFloat(xPercent.toFixed(2));
    this.newDevice.top = parseFloat(yPercent.toFixed(2));

    console.log(`📍 Posizione selezionata: top=${this.newDevice.top}%, left=${this.newDevice.left}%`);
  }

  formatIp(event: any) {
  let value = event.target.value.replace(/[^0-9]/g, ''); // rimuove caratteri non numerici
  const parts = [];

  // Inserisce punti ogni 3 numeri
  for (let i = 0; i < value.length && parts.length < 4; i += 3) {
    parts.push(value.substring(i, i + 3));
  }

  event.target.value = parts.join('.');
  this.newDevice.ip = event.target.value;
}


  loadDevicesAndStats() {
    this.deviceService.loadDevicesFromDB().subscribe({
      next: (data: Device[]) => {
        this.devices.set(data);
        this.updateStats();
      },
      error: (err) => console.error('❌ Errore ricaricamento devices:', err)
    });
  }
}
