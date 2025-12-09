import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../app.config';

@Injectable({
  providedIn: 'root'
})
export class TodoService {

  private apiUrl = API_URL;

  constructor(private http: HttpClient) {}

  // ---------------- Tasks ----------------
  getTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tasks`);
  }

  createTask(task: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/tasks`, task);
  }

  updateTask(id: number, task: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/tasks/${id}`, task);
  }

  deleteTask(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tasks/${id}`);
  }

  // ---------------- GameState ----------------
  getGameState(): Observable<any> {
    return this.http.get(`${this.apiUrl}/gamestate`);
  }

  updateGameState(state: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/gamestate`, state);
  }

}


