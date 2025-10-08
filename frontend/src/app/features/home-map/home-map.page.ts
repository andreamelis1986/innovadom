import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../services/device.service';
import { Device } from '../../models/device.model';

@Component({
    selector: 'app-home-map',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './home-map.page.html',
    styleUrls: ['./home-map.page.css'],
})
export class HomeMapPage implements OnInit {
    private devicesSvc = inject(DeviceService);
    constructor(private cdr: ChangeDetectorRef) { }

    currentTime = '';
    currentDate = '';
    selectedCamera: any = null;
    devices: Device[] = [];

    infoCards = [
        { icon: 'fas fa-lightbulb', title: 'Luci', value: '-', color: '#00bcd4', expanded: false },
        { icon: 'fas fa-temperature-high', title: 'Temperatura', value: '22 °C', color: '#ff9800', expanded: false },
        { icon: 'fas fa-bolt', title: 'Energia', value: '-', color: '#4caf50', expanded: false },
        { icon: 'fas fa-video', title: 'Telecamere', value: '-', color: '#2196f3', expanded: false },
    ];

    currentTemperature = 22;

    ngOnInit(): void {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        this.loadDevicesFromDB();
        this.devicesSvc.connectWebSocket();
    }

    /** Carica dispositivi dal DB */
    loadDevicesFromDB(): void {
        this.devicesSvc.loadDevicesFromDB().subscribe({
            next: (res: Device[]) => {
                // Lasciamo top/left come numeri, senza %
                const normalized = res.map((d) => ({
                    ...d,
                    top: Number(d.top) || 0,
                    left: Number(d.left) || 0,
                    icon: d.icon || this.getIconForType(d.type),
                }));

                console.table(normalized);
                this.devices = normalized;
                this.devicesSvc.devices.set(normalized);
                this.updateInfoCards();
                this.cdr.detectChanges();
            },
            error: (err) => console.error('❌ Errore caricamento dispositivi:', err),
        });
    }

    /** Icone dinamiche per tipo */
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

    updateInfoCards(): void {
        const lightsOn = this.devices.filter(d => d.type === 'light' && d.status === 'on').length;
        const camsOn = this.devices.filter(d => d.type === 'camera' && d.status === 'on').length;

        this.infoCards = [
            { icon: 'fas fa-lightbulb', title: 'Luci', value: `${lightsOn} On`, color: '#00bcd4', expanded: false },
            { icon: 'fas fa-temperature-high', title: 'Temperatura', value: `${this.currentTemperature} °C`, color: '#ff9800', expanded: false },
            { icon: 'fas fa-bolt', title: 'Energia', value: '4.5 kWh', color: '#4caf50', expanded: false },
            { icon: 'fas fa-video', title: 'Telecamere', value: `${camsOn} On`, color: '#2196f3', expanded: false },
        ];
    }

    updateDateTime(): void {
        const now = new Date();
        this.currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.currentDate = now.toLocaleDateString('it-IT', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        });
    }

    toggleDevice(device: Device): void {
        this.devicesSvc.toggleDevice(device.id!);
        device.status = device.status === 'on' ? 'off' : 'on';
        this.updateInfoCards();
    }

    toggleAllLights(): void {
        const allOn = this.areAllLightsOn();
        this.devices
            .filter((d) => d.type === 'light')
            .forEach((light) => {
                const newStatus = allOn ? 'off' : 'on';
                this.devicesSvc.updateDeviceStatus(light.id!, newStatus).subscribe(() => {
                    light.status = newStatus;
                    this.updateInfoCards();
                });
            });
    }

    areAllLightsOn(): boolean {
        return this.devices.filter(d => d.type === 'light').every(d => d.status === 'on');
    }

    openCamera(camera: any): void {
        if (camera.type === 'camera') this.selectedCamera = camera;
    }

    closeCamera(): void {
        this.selectedCamera = null;
    }

    /** 🔽/🔼 Espandi card */
    toggleCard(item: any): void {
        item.expanded = !item.expanded;
    }

    /** 🌡️ Cambia temperatura fittizia */
    changeTemperature(delta: number): void {
        this.currentTemperature += delta;
        this.updateInfoCards();
    }
}

