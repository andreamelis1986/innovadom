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

devices = [
  { type: 'light', icon: 'fas fa-lightbulb', top: '30%', left: '65%', status: 'on' },
  { type: 'climate', icon: 'fas fa-snowflake', top: '80%', left: '20%', status: 'off' },
  { type: 'camera', icon: 'fas fa-video', top: '60%', left: '50%', status: 'on' },
];


  infoCards = [
    { icon: 'fas fa-lightbulb', title: 'Luci', value: '3 On', color: '#00bcd4' },
    { icon: 'fas fa-temperature-high', title: 'Temperatura', value: '22 °C', color: '#ff9800' },
    { icon: 'fas fa-bolt', title: 'Energia', value: '4.5 kWh', color: '#4caf50' },
    { icon: 'fas fa-video', title: 'Telecamere', value: '2 On', color: '#2196f3' },
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

}
