import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef, computed } from '@angular/core';
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
    @ViewChild('cameraCanvas') cameraCanvas!: ElementRef<HTMLCanvasElement>;

    currentTime = '';
    currentDate = '';
    selectedCamera: Device | null = null;
    selectedShutter: Device | null = null;
    devices: Device[] = [];
    loadingDevice = false;
    currentTemperature = 22;
    loadingDeviceId: number | null = null;

    private lastToastTime = 0;
    private lastOfflineAlert: string | null = null;
    private player: any = null;
    streamActive = false;

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

    /** 🔹 Gestione click icona dispositivo */
    handleDeviceClick(device: Device): void {
        if (!device || !device.id || this.loadingDevice) return; // ⛔ evita doppi click

        this.loadingDevice = true;
        this.loadingDeviceId = device.id;
        this.closeAllPopups();
        this.cdr.detectChanges();

        const startTime = Date.now(); // 🕒 momento d’inizio verifica

        this.devicesSvc.checkDeviceOnline(device.id).subscribe({
            next: (res) => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 1000 - elapsed); // ⏱️ minimo 1 s visivo

                const finalize = () => {
                    this.loadingDevice = false;
                    this.loadingDeviceId = null;
                    this.cdr.detectChanges();
                };

                if (!res.online) {
                    setTimeout(() => {
                        if (this.lastOfflineAlert !== device.name) {
                            this.showAlert(`${device.name} è offline`);
                            this.lastOfflineAlert = device.name;
                            setTimeout(() => (this.lastOfflineAlert = null), 2500);
                        }
                        finalize();
                    }, remaining);
                    return;
                }

                // ✅ Se è online → apri la card giusta dopo durata minima
                setTimeout(() => {
                    if (device.type === 'camera') {
                        this.openCamera(device);
                    } else if (device.type === 'shutter') {
                        this.openShutterPopup(device);
                    } else {
                        this.toggleDevice(device);
                    }
                    finalize();
                }, remaining);
            },

            error: (err) => {
                this.loadingDevice = false;
                this.loadingDeviceId = null;

                if (err.message === 'timeout') {
                    this.showAlert(`${device.name} non risponde`);
                } else {
                    this.showAlert(`Impossibile contattare ${device.name}`);
                }

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

    /** 🔹 Accende/spegne tutte le luci */
    toggleAllLights(): void {
        const allOn = this.areAllLightsOn();
        this.devices
            .filter((d) => d.type === 'light')
            .forEach((light) => {
                const oldStatus = light.status;
                light.status = 'loading';

                this.devicesSvc.checkDeviceOnline(light.id!).subscribe({
                    next: (res) => {
                        if (!res.online) {
                            this.showAlert(`${light.name} è offline`);
                            setTimeout(() => {
                                light.status = oldStatus;
                                this.cdr.detectChanges();
                            });
                            return;
                        }

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

        // 🔹 Se esiste già un player attivo → lo fermiamo
        if ((window as any).activePlayer) {
            try {
                (window as any).activePlayer.destroy();
                console.log('🧹 Player precedente chiuso');
            } catch (err) {
                console.warn('⚠️ Errore chiusura player precedente:', err);
            }
        }

        // 🔹 Carica la libreria JSMpeg dal CDN se non è già presente
        const loadJSMpeg = (): Promise<void> => {
            return new Promise((resolve, reject) => {
                if ((window as any).JSMpeg) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/gh/phoboslab/jsmpeg@master/jsmpeg.min.js';
                script.onload = () => {
                    console.log('✅ JSMpeg caricato dal CDN');
                    resolve();
                };
                script.onerror = reject;
                document.body.appendChild(script);
            });
        };

        loadJSMpeg().then(() => {
            setTimeout(() => {
                const canvas = this.cameraCanvas?.nativeElement;
                if (!canvas) {
                    console.warn('⚠️ Canvas non trovato');
                    return;
                }

                // 🔹 Usa la porta WebSocket corretta della telecamera
                const wsUrl = `ws://localhost:${camera.ws_port}`;
                console.log('🎥 Avvio stream da', wsUrl);

                try {
                    const player = new (window as any).JSMpeg.Player(wsUrl, {
                        canvas,
                        autoplay: true,
                        audio: false,
                        loop: true
                    });

                    // ✅ Salva il player globale per poterlo distruggere al cambio camera
                    (window as any).activePlayer = player;
                    console.log('✅ Stream avviato su', wsUrl);
                } catch (err) {
                    console.error('❌ Errore avvio stream:', err);
                }

                this.cdr.detectChanges();
            }, 400);
        });
    }

    closeCamera(): void {
        // Chiude anche il player corrente se esiste
        if ((window as any).activePlayer) {
            try {
                (window as any).activePlayer.destroy();
                (window as any).activePlayer = null;
                console.log('🛑 Player distrutto correttamente');
            } catch (err) {
                console.warn('⚠️ Errore distruzione player:', err);
            }
        }

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
        this.closeCamera();
        this.selectedShutter = null;
    }

    changeTemperature(delta: number): void {
        this.currentTemperature += delta;
    }

    toggleCard(item: any): void {
        item.expanded = !item.expanded;
    }
}
