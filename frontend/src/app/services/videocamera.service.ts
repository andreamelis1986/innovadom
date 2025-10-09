// src/app/features/videocamera/videocamera.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, timer } from 'rxjs';

export interface Camera {
  id: number;
  name: string;
  ip: string | null;
  room: string | null;
  status: 'active' | 'offline';
  rtsp_url: string | null;
  ws_port: number | null;
}

@Injectable({ providedIn: 'root' })
export class VideocameraService {
  private api = 'http://localhost:3000/api/cameras';
  private wsUrl = 'ws://localhost:3000/ws/cameras';

  private ws?: WebSocket;
  private updates$ = new Subject<{ id: number; status: 'active' | 'offline' }>();
  private reconnectDelay = 2000;

  constructor(private http: HttpClient) {}

  getCameras(): Observable<Camera[]> {
    return this.http.get<Camera[]>(this.api);
  }

  // stream di notifiche (camera.update)
  onUpdates(): Observable<{ id: number; status: 'active' | 'offline' }> {
    this.connectWS();
    return this.updates$.asObservable();
  }

  private connectWS() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      this.reconnectDelay = 2000;
      // console.log('WS connesso');
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'camera.update' && msg.data?.id) {
          this.updates$.next(msg.data);
        }
      } catch (_) {}
    };

    this.ws.onclose = () => {
      // retry con backoff semplice
      const delay = this.reconnectDelay;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      timer(delay).subscribe(() => this.connectWS());
    };

    this.ws.onerror = () => {
      try { this.ws?.close(); } catch {}
    };
  }
}
