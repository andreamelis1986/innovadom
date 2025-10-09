import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Device } from '../models/device.model';
import { Observable, catchError, throwError, timeout } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private apiUrl = 'http://localhost:3000/api/devices';
  devices = signal<Device[]>([]);

  constructor(private http: HttpClient) { }

  loadDevicesFromDB(): Observable<Device[]> {
    return this.http.get<Device[]>(this.apiUrl);
  }

  addDevice(device: Device): Observable<Device> {
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

  deleteDevice(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  setPosition(id: number, position: { top: number | string; left: number | string }) {
    const payload = {
      top: typeof position.top === 'string' ? parseFloat(position.top) : position.top,
      left: typeof position.left === 'string' ? parseFloat(position.left) : position.left,
    };
    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

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

  // ✅ CORRETTO: path WebSocket aggiornato
  connectWebSocket() {
    if (typeof window === 'undefined') return;
    const socket = new WebSocket('ws://localhost:3000/ws/cameras');

    socket.onopen = () => console.log('🔌 WebSocket connesso');
    socket.onclose = () => console.log('❌ WebSocket disconnesso');

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'deviceUpdate') {
          this.updateDeviceStatus(data.id, data.status);
        }
      } catch (err) {
        console.error('Errore WebSocket:', err);
      }
    };
  }

  // 🔽 Apri serranda
  openShutter(id: number) {
    return this.http.post(`${this.apiUrl}/${id}/open`, {});
  }

  // 🔼 Chiudi serranda
  closeShutter(id: number) {
    return this.http.post(`${this.apiUrl}/${id}/close`, {});
  }

  // ⚙️ Imposta posizione serranda (percentuale)
  setShutterPosition(id: number, position: number) {
    return this.http.post(`${this.apiUrl}/${id}/position`, { position });
  }

  // 🔍 Controllo stato online
  checkDeviceOnline(id: number) {
    return this.http
      .get<{ online: boolean }>(`${this.apiUrl}/${id}/ping`)
      .pipe(
        timeout(2000), // ⏱️ massimo 2s di attesa
        catchError(() => throwError(() => new Error('timeout')))
      );
  }

}
