import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '../../services/device.service';
import { Device } from '../../models/device.model';
import { ToastComponent } from '../../shared/toast/toast.component';

@Component({
    selector: 'app-home-map',
    standalone: true,
    imports: [CommonModule, FormsModule, ToastComponent],
    templateUrl: './home-map.page.html',
    styleUrls: ['./home-map.page.css'],
})
export class HomeMapPage implements OnInit {
    private devicesSvc = inject(DeviceService);
    constructor(private cdr: ChangeDetectorRef) { }

    @ViewChild(ToastComponent) toast!: ToastComponent;

    currentTime = '';
    currentDate = '';
    selectedCamera: Device | null = null;
    selectedShutter: Device | null = null;
    devices: Device[] = [];
    loadingDevice = false;
    currentTemperature = 22;
    loadingDeviceId: number | null = null; // 🆕 quale device sta caricando

    private lastToastTime = 0;
    private lastOfflineAlert: string | null = null;

    /** ✅ Computed reattivi */
    lightsOn = computed(() =>
        this.devicesSvc.devices().filter(d => d.type === 'light' && d.status === 'on').length
    );
    camsOn = computed(() =>
        this.devicesSvc.devices().filter(d => d.type === 'camera' && d.status === 'on').length
    );

    ngOnInit(): void {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        this.loadDevicesFromDB();
        this.devicesSvc.connectWebSocket();
    }

    /** 🔹 Carica dispositivi dal DB */
    loadDevicesFromDB(): void {
        this.devicesSvc.loadDevicesFromDB().subscribe({
            next: (res: Device[]) => {
                const normalized = res.map((d) => ({
                    ...d,
                    top: Number(d.pos_top) || 0,
                    left: Number(d.pos_left) || 0,
                    icon: d.icon || this.getIconForType(d.type),
                    shutter_position:
                        d.shutter_position != null
                            ? Number(d.shutter_position)
                            : d.position != null
                                ? Number(d.position)
                                : d.type === 'shutter'
                                    ? d.status === 'open'
                                        ? 100
                                        : 0
                                    : undefined,
                }));

                this.devices = normalized;
                this.devicesSvc.devices.set(normalized);
                this.cdr.detectChanges();
            },
            error: (err) => console.error('❌ Errore caricamento dispositivi:', err),
        });
    }

    /** 🔹 Icone dinamiche */
    getIconForType(type: string): string {
        switch (type) {
            case 'light': return 'fas fa-lightbulb';
            case 'climate': return 'fas fa-temperature-high';
            case 'camera': return 'fas fa-video';
            case 'shutter': return 'fas fa-window-maximize';
            case 'sensor': return 'fas fa-wave-square';
            default: return 'fas fa-plug';
        }
    }

    /** 🔹 Gestione click icona */
    handleDeviceClick(device: Device): void {
        if (!device || !device.id || this.loadingDevice) return;
        this.loadingDevice = true;
        this.closeAllPopups();
        this.cdr.detectChanges();

        this.devicesSvc.checkDeviceOnline(device.id).subscribe({
            next: (res) => {
                this.loadingDevice = false;
                if (!res.online) {
                    if (this.lastOfflineAlert !== device.name) {
                        this.showAlert(`${device.name} è offline`);
                        this.lastOfflineAlert = device.name;
                        setTimeout(() => (this.lastOfflineAlert = null), 2500);
                    }
                    return;
                }

                if (device.type === 'camera') this.openCamera(device);
                else if (device.type === 'shutter') this.openShutterPopup(device);
                else this.toggleDevice(device);

                this.cdr.detectChanges();
            },
            error: (err) => {
                this.loadingDevice = false;
                this.showAlert(`${device.name} non risponde`);
                this.cdr.detectChanges();
            },
        });
    }

    areAllLightsOn(): boolean {
        return this.devices.filter((d) => d.type === 'light').every((d) => d.status === 'on');
    }

    /** 🔹 Controllo singolo */
    toggleDevice(device: Device): void {
        this.devicesSvc.toggleDevice(device.id!);
        device.status = device.status === 'on' ? 'off' : 'on';
    }

    /** 🔹 Accende o spegne tutte le luci, controllando connessione e ripristinando stato */
    toggleAllLights(): void {
        const allOn = this.areAllLightsOn();

        this.devices
            .filter((d) => d.type === 'light')
            .forEach((light) => {
                const oldStatus = light.status; // 🔹 salva stato originale
                light.status = 'loading'; // 🌀 stato temporaneo visivo

                this.devicesSvc.checkDeviceOnline(light.id!).subscribe({
                    next: (res) => {
                        if (!res.online) {
                            this.showAlert(`${light.name} è offline`);
                            // 🔧 aggiornamento fuori dal ciclo Angular
                            setTimeout(() => {
                                light.status = oldStatus;
                                this.cdr.detectChanges();
                            });
                            return;
                        }

                        // ✅ Luce online → aggiorna stato effettivo
                        const newStatus = allOn ? 'off' : 'on';
                        this.devicesSvc.updateDeviceStatus(light.id!, newStatus).subscribe({
                            next: () => {
                                setTimeout(() => {
                                    light.status = newStatus;
                                    this.cdr.detectChanges();
                                });
                            },
                            error: () => {
                                this.showAlert(`Errore aggiornamento ${light.name}`);
                                setTimeout(() => {
                                    light.status = oldStatus;
                                    this.cdr.detectChanges();
                                });
                            },
                        });
                    },
                    error: () => {
                        this.showAlert(`Impossibile contattare ${light.name}`);
                        setTimeout(() => {
                            light.status = oldStatus;
                            this.cdr.detectChanges();
                        });
                    },
                });
            });
    }

    /** 🔹 Data e ora */
    updateDateTime(): void {
        const now = new Date();
        this.currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.currentDate = now.toLocaleDateString('it-IT', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        });
    }

    /** 🔹 Camere */
    openCamera(camera: Device): void {
        this.selectedShutter = null;
        this.selectedCamera = camera;
    }

    closeCamera(): void {
        this.selectedCamera = null;
    }

    /** 🔹 Popup serranda */
    openShutterPopup(device: Device): void {
        this.selectedCamera = null;
        const start =
            device.shutter_position ??
            device.position ??
            (device.status === 'open' ? 100 : device.status === 'closed' ? 0 : 50);
        this.selectedShutter = { ...device, shutter_position: Number(start) };
    }

    closeShutterPopup(): void {
        this.selectedShutter = null;
    }

    openShutter(device: Device): void {
        this.devicesSvc.openShutter(device.id!).subscribe({
            next: () => {
                device.status = 'open';
                device.shutter_position = 100;
                this.closeAllPopups();
            },
            error: () => this.showAlert(`${device.name} è offline`),
        });
    }

    closeShutter(device: Device): void {
        this.devicesSvc.closeShutter(device.id!).subscribe({
            next: () => {
                device.status = 'closed';
                device.shutter_position = 0;
                this.closeShutterPopup();
            },
            error: () => this.showAlert(`${device.name} è offline`),
        });
    }

    setShutterPosition(device: Device): void {
        const position = device.shutter_position ?? 0;
        this.devicesSvc.setShutterPosition(device.id!, position).subscribe({
            next: () => console.log(`Serranda impostata al ${position}%`),
            error: () => this.showAlert(`${device.name} è offline`),
        });
    }

    onShutterInput(val: any): void {
        this.selectedShutter!.shutter_position = Number(val);
    }

    /** 🔹 Messaggi toast */
    showAlert(msg: string): void {
        const now = Date.now();
        if (now - this.lastToastTime < 2000) return;
        this.lastToastTime = now;
        if (this.toast) this.toast.show(msg);
    }

    closeAllPopups(): void {
        this.selectedCamera = null;
        this.selectedShutter = null;
    }

    changeTemperature(delta: number): void {
        this.currentTemperature += delta;
    }

    toggleCard(item: any): void {
        item.expanded = !item.expanded;
    }
}
