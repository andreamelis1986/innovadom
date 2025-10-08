import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Device } from '../models/device.model';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private apiUrl = 'http://localhost:3000/api/devices';
  devices = signal<Device[]>([]);

  constructor(private http: HttpClient) { }

  loadDevicesFromDB(): Observable<Device[]> {
    return this.http.get<Device[]>(this.apiUrl);
  }

  addDevice(device: Device): Observable<Device> {
    // 🟢 invia NUMERI al backend (tolgo l'eventuale '%')
    const payload: any = {
      ...device,
      top: typeof device.top === 'string' ? parseFloat(device.top) : device.top,
      left: typeof device.left === 'string' ? parseFloat(device.left) : device.left,
    };
    console.log('👉 POST /devices payload', payload);
    return this.http.post<Device>(this.apiUrl, payload);
  }

  updateDeviceStatus(id: number, status: 'on' | 'off') {
    return this.http.put(`${this.apiUrl}/${id}`, { status });
  }

  deleteDevice(id: number): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => console.log(`✅ Dispositivo ${id} eliminato`),
      error: (err) => console.error('❌ Errore eliminazione:', err)
    });
  }

// Aggiorna posizione (accetta {top,left} in % o numeri)
setPosition(id: number, position: { top: number | string; left: number | string }) {
  const payload = {
    top: typeof position.top === 'string' ? parseFloat(position.top) : position.top,
    left: typeof position.left === 'string' ? parseFloat(position.left) : position.left,
  };
  return this.http.put(`${this.apiUrl}/${id}`, payload);
}

  // ✅ AGGIUNTO: attiva/disattiva un dispositivo
  toggleDevice(id: number): void {
    const currentDevices = this.devices();
    const device = currentDevices.find(d => d.id === id);
    if (!device) return;

    const newStatus = device.status === 'on' ? 'off' : 'on';
    this.updateDeviceStatus(id, newStatus).subscribe({
      next: () => {
        device.status = newStatus;
        this.devices.set([...currentDevices]);
        console.log(`🔁 Dispositivo ${id} aggiornato a ${newStatus}`);
      },
      error: (err) => console.error('❌ Errore toggle dispositivo:', err)
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
}