import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home-map',
  templateUrl: './home-map.page.html',
  styleUrls: ['./home-map.page.css']
})
export class HomeMapPage implements OnInit {
  temperature = 22;
  energy = 4.5;
  lights = 3;
  cameras = 2;

  currentTime: string = '';
  currentDate: string = '';

  devices = [
    { type: 'light', top: '15%', left: '70%' },
    { type: 'ac', top: '80%', left: '30%' },
    { type: 'camera', top: '50%', left: '85%' }
  ];

  ngOnInit(): void {
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 1000);
  }

  updateDateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.currentDate = now.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
}
