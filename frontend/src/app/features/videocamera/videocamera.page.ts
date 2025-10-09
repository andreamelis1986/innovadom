import { Component, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-videocamera',
  templateUrl: './videocamera.page.html',
  styleUrls: ['./videocamera.page.css']
})
export class VideocameraPage implements AfterViewInit {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // 🔹 Carica la libreria JSMpeg (nuovo CDN + fallback)
        await this.loadJSMpegScript();

        const canvas = document.getElementById('provisionCam') as HTMLCanvasElement;
        if (canvas && (window as any).JSMpeg) {
          const player = new (window as any).JSMpeg.Player('ws://localhost:9999', {
            canvas,
            autoplay: true,
            audio: false
          });
          console.log('🎥 Stream avviato con successo');
        } else {
          console.error('❌ Canvas non trovato o JSMpeg non disponibile');
        }
      } catch (err) {
        console.error('❌ Errore nel caricamento di JSMpeg:', err);
      }
    }
  }

  private loadJSMpegScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).JSMpeg) {
        resolve();
        return;
      }

      const script = document.createElement('script');

      // ✅ Usa una versione stabile dal CDN Cloudflare (più affidabile)
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmpeg/0.2/jsmpeg.min.js';
      script.onload = () => {
        console.log('✅ JSMpeg caricato correttamente');
        resolve();
      };
      script.onerror = (err) => {
        console.error('⚠️ Errore nel caricamento del CDN principale, ritento con jsDelivr');
        // 🔁 fallback jsDelivr
        const fallback = document.createElement('script');
        fallback.src = 'https://cdn.jsdelivr.net/gh/phoboslab/jsmpeg@master/jsmpeg.min.js';
        fallback.onload = () => {
          console.log('✅ JSMpeg caricato dal fallback');
          resolve();
        };
        fallback.onerror = (e2) => reject(e2);
        document.body.appendChild(fallback);
      };

      document.body.appendChild(script);
    });
  }
}
