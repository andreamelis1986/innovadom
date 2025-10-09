import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { VideocameraService, Camera } from '../../services/videocamera.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-videocamera',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './videocamera.page.html',
  styleUrls: ['./videocamera.page.css'],
  providers: [VideocameraService] // ✅ garantisce che Angular sappia cosa iniettare
})
export class VideocameraPage implements OnInit {
  cameras: Camera[] = [];
  loading = true;
  private started = new Set<number>(); // stream già avviati
  private updateSub?: Subscription;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(VideocameraService) private svc: VideocameraService, // ✅ @Inject specificato
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadJSMpegScript()
      .then(() => this.initialLoad())
      .catch((err: unknown) => console.error('❌ JSMpeg init:', err));
  }

  private initialLoad(): void {
    this.svc.getCameras().subscribe({
      next: (data: Camera[]) => {
        this.cameras = data;
        this.loading = false;
        this.cdr.detectChanges();

        // avvia stream per quelle già online
        setTimeout(() => this.initStreams(), 150);

        // 🔔 ascolta aggiornamenti in tempo reale
        this.updateSub = this.svc.onUpdates().subscribe((u: { id: number; status: 'active' | 'offline' }) => {
          const cam = this.cameras.find(c => c.id === u.id);
          if (!cam) return;
          const prev = cam.status;
          cam.status = u.status;
          this.cdr.detectChanges();

          // se ora è online → avvia stream
          if (prev !== 'active' && u.status === 'active') {
            setTimeout(() => this.startStream(cam), 50);
          }
        });
      },
      error: (err: unknown) => {
        console.error('❌ Errore /api/cameras:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private initStreams(): void {
    this.cameras.forEach((cam: Camera) => {
      if (cam.status === 'active') this.startStream(cam);
    });
  }

  private startStream(cam: Camera): void {
    if (!cam.ws_port || this.started.has(cam.id)) return;
    const canvas = document.getElementById(`cam-${cam.id}`) as HTMLCanvasElement | null;
    if (!canvas || !(window as any).JSMpeg) return;

    try {
      new (window as any).JSMpeg.Player(`ws://localhost:${cam.ws_port}`, {
        canvas,
        autoplay: true,
        audio: false
      });
      this.started.add(cam.id);
    } catch (e) {
      console.error(`❌ Errore stream ${cam.name}:`, e);
    }
  }

  private loadJSMpegScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const w: any = window as any;
      if (w.JSMpeg) return resolve();
      if (w._jsmpegLoading) return w._jsmpegLoading.then(resolve).catch(reject);

      w._jsmpegLoading = new Promise<void>((res, rej) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmpeg/0.2/jsmpeg.min.js';
        script.onload = () => { w.JSMpeg && (w._jsmpegLoaded = true); res(); };
        script.onerror = () => {
          const fallback = document.createElement('script');
          fallback.src = 'https://cdn.jsdelivr.net/gh/phoboslab/jsmpeg@master/jsmpeg.min.js';
          fallback.onload = () => res();
          fallback.onerror = (e) => rej(e);
          document.body.appendChild(fallback);
        };
        document.body.appendChild(script);
      });

      w._jsmpegLoading.then(resolve).catch(reject);
    });
  }

  ngOnDestroy(): void {
    this.updateSub?.unsubscribe();
  }
}
