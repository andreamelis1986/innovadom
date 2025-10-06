import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FotovoltaicoService {
  private apiUrl = 'http://localhost:3000/api/huawei/status';

  constructor(private http: HttpClient) {}

  getStatus(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
}
