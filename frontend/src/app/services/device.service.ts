import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Device } from '../models/device.model';
import { Observable, catchError, throwError, timeout } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private apiUrl = 'http://localhost:3000/api/devices';
  devices = signal<Device[]>([]);

  constructor(private http: HttpClient) {}

  /** 🔹 Carica tutti i dispositivi dal DB */
  loadDevicesFromDB(): Observable<Device[]> {
    return this.http.get<Device[]>(this.apiUrl);
  }

  /** 🔹 Aggiunge un nuovo dispositivo */
  addDevice(device: Device): Observable<Device> {
    const payload: any = {
      ...device,
      top: typeof device.top === 'string' ? parseFloat(device.top) : device.top,
      left: typeof device.left === 'string' ? parseFloat(device.left) : device.left,
    };
    console.log('👉 POST /devices payload', payload);
    return this.http.post<Device>(this.apiUrl, payload);
  }

  /** 🔹 Aggiorna stato dispositivo */
  updateDeviceStatus(id: number, status: 'on' | 'off' | 'active' | 'offline') {
    return this.http.put(`${this.apiUrl}/${id}`, { status });
  }

  /** 🔹 Elimina (disattiva) un dispositivo */
  deleteDevice(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /** 🔹 Aggiorna posizione grafica del device */
  setPosition(id: number, position: { top: number | string; left: number | string }) {
    const payload = {
      top: typeof position.top === 'string' ? parseFloat(position.top) : position.top,
      left: typeof position.left === 'string' ? parseFloat(position.left) : position.left,
    };
    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

  /** 🔹 Toggle on/off */
  toggleDevice(id: number): void {
    const currentDevices = this.devices();
    const device = currentDevices.find((d) => d.id === id);
    if (!device) return;

    const newStatus = device.status === 'on' ? 'off' : 'on';
    this.updateDeviceStatus(id, newStatus).subscribe({
      next: () => {
        device.status = newStatus;
        this.devices.set([...currentDevices]);
        console.log(`🔁 Dispositivo ${id} aggiornato a ${newStatus}`);
      },
      error: (err) => console.error('❌ Errore toggle dispositivo:', err),
    });
  }

  /** 🔹 Connessione WebSocket per aggiornamenti real-time */
  connectWebSocket() {
    if (typeof window === 'undefined') return;
    const socket = new WebSocket('ws://localhost:3000/ws/cameras');

    socket.onopen = () => console.log('🔌 WebSocket connesso');
    socket.onclose = () => console.log('❌ WebSocket disconnesso');

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // ✅ Gestisce broadcast da statusHub
        if (data.type === 'camera_status' && data.payload) {
          const { id, status } = data.payload;
          const currentDevices = this.devices();
          const dev = currentDevices.find((d) => d.id === id);
          if (dev) {
            dev.status = status;
            this.devices.set([...currentDevices]);
            console.log(`📡 Stato camera aggiornato: ${dev.name} → ${status}`);
          }
        } else if (data.type === 'deviceUpdate') {
          this.updateDeviceStatus(data.id, data.status);
        }
      } catch (err) {
        console.error('Errore WebSocket:', err);
      }
    };
  }

  /** 🔹 Apri serranda */
  openShutter(id: number) {
    return this.http.post(`${this.apiUrl}/${id}/open`, {});
  }

  /** 🔹 Chiudi serranda */
  closeShutter(id: number) {
    return this.http.post(`${this.apiUrl}/${id}/close`, {});
  }

  /** 🔹 Imposta posizione serranda */
  setShutterPosition(id: number, position: number) {
    return this.http.post(`${this.apiUrl}/${id}/position`, { position });
  }

  /** 🔍 Controlla se un device è online (telecamere o Shelly) */
  checkDeviceOnline(id: number) {
    return this.http
      .get<{ online: boolean }>(`${this.apiUrl}/${id}/check`) // ✅ aggiornata da /ping a /check
      .pipe(
        timeout(2000),
        catchError(() => throwError(() => new Error('timeout')))
      );
  }
}
