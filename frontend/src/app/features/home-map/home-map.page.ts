import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-map.page.html',
  styleUrls: ['./home-map.page.css']
})
export class HomeMapPage implements AfterViewInit, OnDestroy {
  @ViewChild('wrap', { static: false }) wrapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('plan', { static: false }) planRef!: ElementRef<HTMLImageElement>;

  isCollapsed = false;
  private ro?: ResizeObserver;
  private resizeHandler?: () => void;

  rooms = ['Soggiorno', 'Cucina', 'Camera 1', 'Camera 2'];
  selectedRoom = 'Tutte';
  homeStatus = { lightsOn: 6, temperature: 22, energyKwh: 3.4, camerasOn: 2 };

devices = [
  { name: 'Luce Cortile', type: 'light', status: true, x: 50, y: 50, room: 'Cortile' },
  { name: 'Clima Camera', type: 'clima', status: false, x: 20, y: 80, room: 'Camera 1' },
  { name: 'Telecamera', type: 'camera', status: true, x: 80, y: 30, room: 'Soggiorno' }
];


  imageBox = { left: 0, top: 0, width: 1, height: 1 };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.calcImageBox();

    if (typeof (window as any).ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.calcImageBox());
      this.ro.observe(this.wrapRef.nativeElement);
    } else {
      this.resizeHandler = () => this.calcImageBox();
      window.addEventListener('resize', this.resizeHandler);
    }
  }

  ngOnDestroy() {
    this.ro?.disconnect();
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  toggleBars() {
    this.isCollapsed = !this.isCollapsed;
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.calcImageBox(), 300); // ricalcola dopo l’animazione CSS
    }
  }

  calcImageBox() {
    if (!this.wrapRef?.nativeElement || !this.planRef?.nativeElement) return;

    const wrap = this.wrapRef.nativeElement;
    const img = this.planRef.nativeElement;
    const wrapRect = wrap.getBoundingClientRect();

    const naturalRatio = img.naturalWidth / img.naturalHeight;
    const wrapRatio = wrapRect.width / wrapRect.height;

    let renderWidth: number, renderHeight: number;

    if (wrapRatio > naturalRatio) {
      renderHeight = wrapRect.height;
      renderWidth = renderHeight * naturalRatio;
    } else {
      renderWidth = wrapRect.width;
      renderHeight = renderWidth / naturalRatio;
    }

    this.imageBox = {
      left: (wrapRect.width - renderWidth) / 2,
      top: (wrapRect.height - renderHeight) / 2,
      width: renderWidth,
      height: renderHeight
    };
  }

  normalize(x: number, y: number) {
    return {
      left: this.imageBox.left + (x / 100) * this.imageBox.width,
      top: this.imageBox.top + (y / 100) * this.imageBox.height
    };
  }

  iconStyle(dev: any) {
    const pos = this.normalize(dev.x, dev.y);
    return { left: pos.left + 'px', top: pos.top + 'px' };
  }

  toggleDevice(dev: any) {
    dev.status = !dev.status;
  }

  iconFor(type: string) {
    switch (type) {
      case 'light': return '💡';
      case 'camera': return '📷';
      case 'clima': return '❄️';
      default: return '🔘';
    }
  }

  get filteredDevices() {
    if (this.selectedRoom === 'Tutte') return this.devices;
    return this.devices.filter(d => d.room === this.selectedRoom);
  }
}
