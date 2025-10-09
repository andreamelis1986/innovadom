import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast" *ngIf="visible">
      <i class="fas fa-info-circle"></i> {{ message }}
    </div>
  `,
  styleUrls: ['./toast.component.css']
})
export class ToastComponent {
  @Input() message = '';
  visible = false;
  private hideTimer: any;

  constructor(private cdr: ChangeDetectorRef) {}

  show(msg: string, duration = 3000) {
    this.message = msg;
    this.visible = true;
    this.cdr.detectChanges(); // 🔹 forza refresh DOM subito

    // Cancella eventuale timer precedente
    if (this.hideTimer) clearTimeout(this.hideTimer);

    // Nasconde dopo X secondi
    this.hideTimer = setTimeout(() => {
      this.visible = false;
      this.cdr.detectChanges(); // 🔹 forza chiusura visiva
    }, duration);
  }
}
