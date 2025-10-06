import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-home-map',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './home-map.page.html',
    styleUrls: ['./home-map.page.css'],
})
export class HomeMapPage implements OnInit {
    currentTime = '';
    currentDate = '';

    selectedCamera: any = null;

    devices = [
        { type: 'light', icon: 'fas fa-lightbulb', top: '24%', left: '43%', status: 'on' },
        { type: 'light', icon: 'fas fa-lightbulb', top: '24%', left: '63%', status: 'on' },
        { type: 'climate', icon: 'fas fa-snowflake', top: '24%', left: '54%', status: 'off' },
        { type: 'camera', icon: 'fas fa-video', top: '27%', left: '86%', status: 'on' },
        { type: 'camera', icon: 'fas fa-video', top: '81%', left: '66%', status: 'on', streamUrl: 'assets/video_sample.mp4' },

    ];

    infoCards = [
        { icon: 'fas fa-lightbulb', title: 'Luci', value: '3 On', color: '#00bcd4', expanded: false },
        { icon: 'fas fa-temperature-high', title: 'Temperatura', value: '22 °C', color: '#ff9800', expanded: false },
        { icon: 'fas fa-bolt', title: 'Energia', value: '4.5 kWh', color: '#4caf50', expanded: false },
        { icon: 'fas fa-video', title: 'Telecamere', value: '2 On', color: '#2196f3', expanded: false },
    ];


    ngOnInit() {
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

    updateDateTime() {
        const now = new Date();
        this.currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.currentDate = now.toLocaleDateString('it-IT', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }

    toggleDevice(device: any) {
        device.status = device.status === 'on' ? 'off' : 'on';
    }

    toggleCard(item: any) {
        item.expanded = !item.expanded;
    }


    currentTemperature = 22;

    changeTemperature(delta: number) {
        this.currentTemperature += delta;
    }

    getDevicesByType(type: string) {
        return this.devices.filter(device => device.type === type);
    }

    toggleAllLights() {
        const allOn = this.areAllLightsOn();
        this.devices
            .filter(device => device.type === 'light')
            .forEach(light => light.status = allOn ? 'off' : 'on');
    }

    areAllLightsOn(): boolean {
        return this.devices
            .filter(device => device.type === 'light')
            .every(light => light.status === 'on');
    }

    openCamera(camera: any) {
        if (camera.type === 'camera') {
            this.selectedCamera = camera;
        }
    }

    closeCamera() {
        this.selectedCamera = null;
    }

}
