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
  editingDevice: Device | null = null;

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
    this.deviceService.updateDeviceStatus(device.id!, device.status).subscribe();
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

    this.deviceService.addDevice(this.newDevice).subscribe({
      next: (created) => {
        if (!created || (created as any).error) {
          this.errorMessage = (created as any).error || 'Errore durante la creazione.';
          this.isAdding = false;
          return;
        }

        this.zone.run(() => {
          this.devices.update(devices => [...devices, created]);
          this.updateStats();
          this.showAddForm = false;
          this.newDevice = { name: '', type: 'light', ip: '', status: 'off', top: 0, left: 0 };
          this.successMessage = '✅ Dispositivo aggiunto con successo!';
          this.isAdding = false;
          setTimeout(() => this.successMessage = '', 5000);
        });
      },
      error: (err) => {
        console.error('❌ Errore backend:', err);
        this.errorMessage = '❌ Errore durante l’aggiunta del dispositivo.';
        this.isAdding = false;
      }
    });
  }

  openDeleteConfirm(device: Device) {
    this.confirmDeleteDevice = device;
  }

  confirmDelete() {
    if (!this.confirmDeleteDevice) return;

    const id = this.confirmDeleteDevice.id!;
    const name = this.confirmDeleteDevice.name;

    this.deviceService.deleteDevice(id).subscribe({
      next: () => {
        this.devices.update(devices => devices.filter(d => d.id !== id));
        this.updateStats();
        this.successMessage = `🗑️ Dispositivo "${name}" eliminato con successo.`;
        this.confirmDeleteDevice = null;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        console.error('❌ Errore eliminazione:', err);
        this.errorMessage = 'Errore durante l’eliminazione del dispositivo.';
      }
    });
  }

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

  loadDevicesAndStats() {
    this.deviceService.loadDevicesFromDB().subscribe({
      next: (data: Device[]) => {
        this.devices.set(data);
        this.updateStats();
      },
      error: (err) => console.error('❌ Errore ricaricamento devices:', err)
    });
  }

openEditDevice(device: Device) {
  this.editingDevice = {
    ...device,
    top: Number(device.top ?? device.pos_top ?? 0),
    left: Number(device.left ?? device.pos_left ?? 0)
  };
}
private getPercentFromContainer(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement; // .map-container
  const r = el.getBoundingClientRect();
  const x = ((event.clientX - r.left) / r.width) * 100;
  const y = ((event.clientY - r.top) / r.height) * 100;
  return { left: +x.toFixed(2), top: +y.toFixed(2) };
}
  closeEditDevice() {
    this.editingDevice = null;
  }
  saveEditedDevice() {
    if (!this.editingDevice) return;
    const updated = this.editingDevice;

    this.deviceService.updateDevice(updated.id!, updated).subscribe({
      next: () => {
        this.devices.update(devs => devs.map(d => d.id === updated.id ? updated : d));
        this.successMessage = '✅ Dispositivo aggiornato con successo!';
        setTimeout(() => (this.successMessage = ''), 4000);
        this.editingDevice = null;
        this.updateStats();
      },
      error: (err) => {
        console.error('Errore aggiornamento:', err);
        this.errorMessage = '❌ Errore durante il salvataggio.';
      }
    });
  }

  /** Aggiunta */
  private getPercentCoordsFromContainer(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement;         // .map-container
    const rect = el.getBoundingClientRect();               // <-- sempre il container
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    return {
      left: +xPercent.toFixed(2),
      top: +yPercent.toFixed(2),
    };
  }

/** Calcola coordinate % relative al CONTAINER con object-fit: contain */
private getAccuratePercentCoords(event: MouseEvent) {
  const container = event.currentTarget as HTMLElement;
  const img = container.querySelector('img') as HTMLImageElement;
  const rect = container.getBoundingClientRect();

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const containerRatio = rect.width / rect.height;

  let renderedWidth: number;
  let renderedHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > containerRatio) {
    // immagine “piena” in larghezza → barre sopra/sotto
    renderedWidth = rect.width;
    renderedHeight = rect.width / imgRatio;
    offsetY = (rect.height - renderedHeight) / 2;
  } else {
    // immagine “piena” in altezza → barre laterali
    renderedHeight = rect.height;
    renderedWidth = rect.height * imgRatio;
    offsetX = (rect.width - renderedWidth) / 2;
  }

  // coord normalizzate dentro al rettangolo effettivo dell'immagine
  const x = (event.clientX - rect.left - offsetX) / renderedWidth;
  const y = (event.clientY - rect.top - offsetY) / renderedHeight;

  // → percentuali nel sistema del CONTAINER
  const leftPct = ((offsetX + renderedWidth * x) / rect.width) * 100;
  const topPct  = ((offsetY + renderedHeight * y) / rect.height) * 100;

  return {
    left: +leftPct.toFixed(2),
    top: +topPct.toFixed(2),
  };
}

/** Bounding box “rendered” dell’immagine dentro il container (object-fit: contain) */
private getRenderedImageBox(containerEl: HTMLElement) {
  const img = containerEl.querySelector('img') as HTMLImageElement;
  const cRect = containerEl.getBoundingClientRect();

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const cRatio   = cRect.width / cRect.height;

  let w: number, h: number, offX = 0, offY = 0;
  if (imgRatio > cRatio) {
    // piena in larghezza → barre sopra/sotto
    w = cRect.width;
    h = w / imgRatio;
    offY = (cRect.height - h) / 2;
  } else {
    // piena in altezza → barre ai lati
    h = cRect.height;
    w = h * imgRatio;
    offX = (cRect.width - w) / 2;
  }
  return { w, h, offX, offY, cRect };
}

/** CLICK: container -> percentuali immagine (da salvare in DB) */
private coordsFromClickToImgPct(ev: MouseEvent, containerEl: HTMLElement) {
  const { w, h, offX, offY, cRect } = this.getRenderedImageBox(containerEl);
  const x = (ev.clientX - cRect.left - offX) / w;
  const y = (ev.clientY - cRect.top  - offY) / h;
  return { left: +(x * 100).toFixed(2), top: +(y * 100).toFixed(2) };
}

/** PREVIEW: percentuali immagine -> percentuali container (per posizionare l’icona) */
pctImgToPctContainer(pct: number | undefined, axis: 'x' | 'y', containerEl: HTMLElement): number {
  const { w, h, offX, offY, cRect } = this.getRenderedImageBox(containerEl);
  const p = pct ?? 0; // fallback sicuro

  if (axis === 'x') {
    const xPx = offX + (w * p / 100);
    return +(xPx / cRect.width * 100).toFixed(2);
  } else {
    const yPx = offY + (h * p / 100);
    return +(yPx / cRect.height * 100).toFixed(2);
  }
}


/** EDIT: aggiorna posizione salvando percentuali relative all’immagine */
updatePosition(event: MouseEvent) {
  if (!this.editingDevice) return;
  const { left, top } = this.getPercentFromContainer(event);
  this.editingDevice.left = left;
  this.editingDevice.top = top;
}

selectPosition(event: MouseEvent) {
  const { left, top } = this.getPercentFromContainer(event);
  this.newDevice.left = left;
  this.newDevice.top = top;
}

}
