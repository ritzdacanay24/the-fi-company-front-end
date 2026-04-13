import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  constructor(private http: HttpClient) { }

  getData(soNumberAndLineNumber: string, userId: number): Observable<any> {
    return this.http.get<any>(`/Notes/index?getById=1&so=${soNumberAndLineNumber}&userId=${userId}`);
  }

  saveNotes(params: any): Observable<any> {
    return this.http.post(`/Notes/index`, params)
  }


}
