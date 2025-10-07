import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Device } from '../models/device.model';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private _devices = signal<Device[]>([]);
  devices = this._devices.asReadonly();

  private apiUrl = '/api/devices'; // proxy.conf.json → http://localhost:3000/api/devices

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadDevicesFromDB();
    }
  }

  // === CARICA DAL BACKEND ===
  loadDevicesFromDB() {
    this.http.get<Device[]>(this.apiUrl).subscribe({
      next: (data) => {
        this._devices.set(data);
        console.log('🔹 Devices caricati dal backend:', data);
      },
      error: (err) => console.error('❌ Errore caricamento devices:', err)
    });
  }

  // === CRUD ===
  addDevice(device: Device) {
    return this.http.post<Device>(`${this.apiUrl}/devices`, device);
  }

  deleteDevice(id: number) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this._devices.update(list => list.filter(d => d.id !== id));
      },
      error: (err) => console.error('Errore eliminazione device:', err)
    });
  }

  updateDeviceStatus(id: number, status: 'on' | 'off') {
    this.http.put(`${this.apiUrl}/${id}`, { status }).subscribe({
      next: () => {
        this._devices.update(list =>
          list.map(d => (d.id === id ? { ...d, status } : d))
        );
      },
      error: (err) => console.error('Errore aggiornamento stato:', err)
    });
  }

  updateDevicePosition(id: number, top: number, left: number) {
    this.http.put(`${this.apiUrl}/${id}/position`, { top, left }).subscribe({
      next: () => {
        this._devices.update(list =>
          list.map(d => (d.id === id ? { ...d, top, left } : d))
        );
      },
      error: (err) => console.error('Errore aggiornamento posizione:', err)
    });
  }

  connectWebSocket() {
    if (typeof window === 'undefined') return; // evita errore SSR

    const socket = new WebSocket('ws://localhost:3000');

    socket.onopen = () => console.log('🔌 WebSocket connesso');
    socket.onclose = () => console.log('❌ WebSocket disconnesso');

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Gestisci messaggi del backend (es. aggiornamenti di stato)
        if (data.type === 'deviceUpdate') {
          this.updateDeviceStatus(data.id, data.status);
        }
      } catch (err) {
        console.error('Errore WebSocket:', err);
      }
    };
  }

  // === AGGIORNA POSIZIONE (es. nella mappa)
  setPosition(id: number, position: number) {
    this.http.put(`${this.apiUrl}/${id}`, { position }).subscribe({
      next: () => {
        this._devices.update(list =>
          list.map(d => (d.id === id ? { ...d, position } : d))
        );
      },
      error: (err) => console.error('Errore aggiornamento posizione:', err)
    });
  }

  // === TOGGLE STATO ON/OFF
  toggleDevice(id: number) {
    const current = this._devices().find(d => d.id === id);
    if (!current) return;

    const newStatus: 'on' | 'off' = current.status === 'on' ? 'off' : 'on';

    this.http.put(`${this.apiUrl}/${id}`, { status: newStatus }).subscribe({
      next: () => {
        this._devices.update(list =>
          list.map(d => (d.id === id ? { ...d, status: newStatus } : d))
        );
      },
      error: (err) => console.error('Errore toggle device:', err)
    });
  }



}
