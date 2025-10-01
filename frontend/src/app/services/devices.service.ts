import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Device {
  id: number;
  name: string;
  type: string;   // "light" | "shutter"
  ip: string;
  state: string;  // "on" | "off" | "open" | "closed" | "moving" | "stopped"
  position?: number; // 0–100 se serranda
}

@Injectable({ providedIn: 'root' })
export class DevicesService {
  private apiUrl = 'http://localhost:3000/api'; // backend
  private wsUrl = 'ws://localhost:3000';        // WebSocket backend

  devices = signal<Device[]>([]);

  constructor(private http: HttpClient) {}

  // 🔹 Carica lista dispositivi
  loadDevices() {
    this.http.get<Device[]>(`${this.apiUrl}/devices`).subscribe({
      next: (list) => {
        this.devices.set(list);
        console.log('📦 Lista iniziale caricata:', list);
      },
      error: (err) => console.error('❌ Errore caricamento devices', err)
    });
  }

  // 🔹 Collega WebSocket
  connectWebSocket() {
    const ws = new WebSocket(this.wsUrl);

    ws.onopen = () => {
      console.log('🔌 WebSocket connesso al backend');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📩 Evento WS ricevuto:', data);

        if (data.id) {
          this.devices.update(list =>
            list.map(d =>
              d.id === data.id ? { ...d, ...data } : d
            )
          );
        } else {
          console.log('ℹ️ Messaggio WS non relativo a device:', data);
        }
      } catch (e) {
        console.error('⚠️ Errore parsing WS', e);
      }
    };
  }

  // 🔹 Toggle luce o comandi serranda
  toggleDevice(id: number, action?: 'up' | 'down' | 'stop') {
    let url = `${this.apiUrl}/devices/${id}/toggle`; // default luce
    if (action) {
      url = `${this.apiUrl}/devices/${id}/shutter/${action}`; // serranda
    }

    this.http.post(url, {}).subscribe({
      next: (res) => console.log(`✅ Comando inviato al device ${id}`, res),
      error: (err) => console.error('❌ Errore toggle dispositivo', err)
    });
  }

  // 🔹 Imposta posizione serranda (%)
setPosition(id: number, position: number) {
  this.http.post(`${this.apiUrl}/devices/${id}/shutter/position`, { pos: position }).subscribe({
    next: (res) => console.log(`✅ Posizione inviata a device ${id}: ${position}%`, res),
    error: (err) => console.error('❌ Errore setPosition serranda', err)
  });
}


}
