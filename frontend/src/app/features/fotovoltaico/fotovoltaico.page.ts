import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-fotovoltaico',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './fotovoltaico.page.html',
  styleUrls: ['./fotovoltaico.page.scss']
})
export class FotovoltaicoPage implements OnInit {
  data: any = {};
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchData();
    setInterval(() => this.fetchData(), 10000);
  }

  fetchData() {
    this.http.get('http://localhost:3000/api/huawei/status').subscribe({
      next: (res: any) => {
        this.data = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Errore caricamento dati fotovoltaico:', err);
        this.loading = false;
      }
    });
  }
}
