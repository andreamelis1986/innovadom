import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { VideocameraService, Camera } from '../../services/videocamera.service';
import { Subscription } from 'rxjs';
import { ToastComponent } from '../../shared/toast/toast.component';

@Component({
  selector: 'app-videocamera',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ToastComponent], // ✅ aggiunto ToastComponent
  templateUrl: './videocamera.page.html',
  styleUrls: ['./videocamera.page.css'],
  providers: [VideocameraService] // ✅ garantisce che Angular sappia cosa iniettare
})
export class VideocameraPage implements OnInit {
  cameras: Camera[] = [];
  loading = true;
  private started = new Set<number>(); // stream già avviati
  private updateSub?: Subscription;
  fullscreenCam: Camera | null = null;
  private fullscreenPlayer?: any;
  private players: Map<number, any> = new Map();
  gridClass = 'cols-1'; // classe CSS da applicare

  @ViewChild(ToastComponent) toast!: ToastComponent;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(VideocameraService) private svc: VideocameraService, // ✅ @Inject specificato
    private cdr: ChangeDetectorRef
  ) { }

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
        this.updateGridLayout(); // 🔹 imposta layout in base al numero di telecamere
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

          // 🔹 aggiorna layout in caso di variazioni
          this.updateGridLayout();

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
      const player = new (window as any).JSMpeg.Player(`ws://localhost:${cam.ws_port}`, {
        canvas,
        autoplay: true,
        audio: false
      });
      this.players.set(cam.id, player);
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
    this.players.forEach((p) => {
      if (p && p.destroy) p.destroy();
    });
    this.players.clear();
  }

  // 🔹 Apre una telecamera in fullscreen
  openFullscreen(cam: Camera) {
    // ⛔ Se è offline → non aprire e mostra toast
    if (cam.status !== 'active') {
      if (this.toast) this.toast.show(`${cam.name} è offline`, 3000);
      return;
    }

    this.fullscreenCam = cam;
    setTimeout(() => this.startStreamFull(cam), 50);
  }

  // 🔹 Esce dalla vista fullscreen
  closeFullscreen() {
    if (this.fullscreenPlayer && this.fullscreenPlayer.destroy) {
      this.fullscreenPlayer.destroy();
      this.fullscreenPlayer = undefined;
    }
    this.fullscreenCam = null;

    // 🧹 Chiude e riavvia tutti i flussi
    // ✅ Non distrugge gli altri stream, li lascia attivi
    this.fullscreenCam = null;
    this.cdr.detectChanges();

    // Se il player fullscreen esiste, distruggilo
    if (this.fullscreenPlayer && this.fullscreenPlayer.destroy) {
      this.fullscreenPlayer.destroy();
      this.fullscreenPlayer = undefined;
    }
  }

  // 🔹 Mostra tutte le telecamere in fullscreen
  toggleFullscreenAll() {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }

  private startStreamFull(cam: Camera): void {
    const canvas = document.getElementById(`cam-full-${cam.id}`) as HTMLCanvasElement;
    if (!canvas || !(window as any).JSMpeg) return;

    try {
      // stop eventuale player precedente
      if (this.fullscreenPlayer && this.fullscreenPlayer.destroy) {
        this.fullscreenPlayer.destroy();
      }

      this.fullscreenPlayer = new (window as any).JSMpeg.Player(`ws://localhost:${cam.ws_port}`, {
        canvas,
        autoplay: true,
        audio: false
      });
    } catch (e) {
      console.error(`❌ Errore stream fullscreen ${cam.name}:`, e);
    }
  }

  /** 🔹 Adatta la griglia al numero di telecamere */
  private updateGridLayout(): void {
    const count = this.cameras.length;
    if (count <= 1) this.gridClass = 'cols-1';
    else if (count === 2) this.gridClass = 'cols-2';
    else if (count <= 4) this.gridClass = 'cols-3';
    else this.gridClass = 'cols-4';
  }


}
