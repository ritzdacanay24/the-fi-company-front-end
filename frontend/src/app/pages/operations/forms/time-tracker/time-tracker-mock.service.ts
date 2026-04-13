import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { TimeEntry, WorkSession, Project } from './time-tracker.component';

@Injectable({
  providedIn: 'root'
})
export class TimeTrackerMockService {
  private mockProjects: Project[] = [
    { id: 1, name: 'Development', color: '#28a745', description: 'Software development and coding' },
    { id: 2, name: 'Customer Service', color: '#007bff', description: 'Customer support and relations' },
    { id: 3, name: 'Operations', color: '#ffc107', description: 'Daily operations and maintenance' },
    { id: 4, name: 'Training', color: '#6f42c1', description: 'Learning and skill development' },
    { id: 5, name: 'Administration', color: '#fd7e14', description: 'Administrative tasks and paperwork' }
  ];

  private mockWorkSessions: WorkSession[] = [
    {
      id: 1,
      title: 'Frontend Development Session',
      project_id: 1,
      total_time: 3600, // 1 hour in seconds
      status: 'completed',
      created_by: 1,
      created_by_name: 'John Doe',
      created_date: '2025-09-15T09:00:00',
      completed_date: '2025-09-15T10:00:00'
    },
    {
      id: 2,
      title: 'Customer Support Review',
      project_id: 2,
      total_time: 1800, // 30 minutes in seconds
      status: 'completed',
      created_by: 1,
      created_by_name: 'John Doe',
      created_date: '2025-09-15T14:00:00',
      completed_date: '2025-09-15T14:30:00'
    }
  ];

  private mockTimeEntries: TimeEntry[] = [
    {
      id: 1,
      title: 'Fix Angular component bugs',
      start_time: '2025-09-15T09:00:00',
      end_time: '2025-09-15T10:00:00',
      project_id: 1,
      category: 'Development',
      tags: 'angular,debugging,frontend',
      notes: 'Fixed several template binding issues',
      time_tracker_id: 1,
      created_by: 1,
      created_date: '2025-09-15T09:00:00',
      productivity_score: 85
    },
    {
      id: 2,
      title: 'Customer email responses',
      start_time: '2025-09-15T14:00:00',
      end_time: '2025-09-15T14:30:00',
      project_id: 2,
      category: 'Customer Service',
      tags: 'email,support,communication',
      notes: 'Responded to 5 customer inquiries',
      time_tracker_id: 2,
      created_by: 1,
      created_date: '2025-09-15T14:00:00',
      productivity_score: 90
    }
  ];

  private nextSessionId = 3;
  private nextEntryId = 3;

  // Mock TimeTrackerService methods
  async create(sessionData: Partial<WorkSession>): Promise<{ insertId: number }> {
    console.log('Mock service create called with:', sessionData);
    console.log('Next session ID:', this.nextSessionId);
    console.log('Current sessions before create:', this.mockWorkSessions.map(s => ({id: s.id, title: s.title})));
    
    const newSession: WorkSession = {
      id: this.nextSessionId++,
      title: sessionData.title || '',
      project_id: sessionData.project_id,
      total_time: 0,
      status: sessionData.status || 'active',
      created_by: sessionData.created_by || 1,
      created_by_name: sessionData.created_by_name || 'Mock User',
      created_date: sessionData.created_date || new Date().toISOString()
    };
    
    console.log('Creating new session:', newSession);
    this.mockWorkSessions.push(newSession);
    console.log('Sessions after create:', this.mockWorkSessions.map(s => ({id: s.id, title: s.title})));
    
    // Simulate API delay (reduced for testing)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log('Returning insertId:', newSession.id);
    return { insertId: newSession.id! };
  }

  async getById(id: number): Promise<WorkSession> {
    console.log('Mock service getById called with id:', id);
    console.log('Available sessions:', this.mockWorkSessions.map(s => ({id: s.id, title: s.title})));
    
    // Simulate API delay (reduced for testing)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const session = this.mockWorkSessions.find(s => s.id === id);
    if (!session) {
      console.log('Session not found!');
      throw new Error(`Session with id ${id} not found`);
    }
    
    console.log('Found session:', session);
    return { ...session };
  }

  async update(id: number, data: Partial<WorkSession>): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const sessionIndex = this.mockWorkSessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) {
      throw new Error(`Session with id ${id} not found`);
    }
    
    this.mockWorkSessions[sessionIndex] = {
      ...this.mockWorkSessions[sessionIndex],
      ...data
    };
  }

  async delete(id: number): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const sessionIndex = this.mockWorkSessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) {
      throw new Error(`Session with id ${id} not found`);
    }
    
    this.mockWorkSessions.splice(sessionIndex, 1);
    
    // Also delete related time entries
    this.mockTimeEntries = this.mockTimeEntries.filter(entry => entry.time_tracker_id !== id);
  }

  // Mock TimeTrackerDetailService methods
  async find(criteria: { time_tracker_id: number }): Promise<TimeEntry[]> {
    console.log('Mock service find called with criteria:', criteria);
    console.log('Available entries:', this.mockTimeEntries);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const filteredEntries = this.mockTimeEntries
      .filter(entry => entry.time_tracker_id === criteria.time_tracker_id)
      .map(entry => ({ ...entry }));
      
    console.log('Filtered entries for session:', filteredEntries);
    return filteredEntries;
  }

  async createTimeEntry(entryData: Partial<TimeEntry>): Promise<{ insertId: number }> {
    console.log('Mock service createTimeEntry called with:', entryData);
    
    const newEntry: TimeEntry = {
      id: this.nextEntryId++,
      title: entryData.title || '',
      start_time: entryData.start_time || new Date().toISOString(),
      end_time: entryData.end_time || new Date().toISOString(),
      project_id: entryData.project_id,
      category: entryData.category,
      tags: entryData.tags,
      notes: entryData.notes,
      time_tracker_id: entryData.time_tracker_id || 0,
      created_by: entryData.created_by || 1,
      created_date: entryData.created_date || new Date().toISOString(),
      productivity_score: entryData.productivity_score || 75
    };
    
    console.log('Created new entry:', newEntry);
    this.mockTimeEntries.push(newEntry);
    console.log('Total entries now:', this.mockTimeEntries.length);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return { insertId: newEntry.id! };
  }

  async updateTimeEntry(id: number, entryData: Partial<TimeEntry>): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const entryIndex = this.mockTimeEntries.findIndex(entry => entry.id === id);
    if (entryIndex === -1) {
      throw new Error(`Time entry with id ${id} not found`);
    }
    
    this.mockTimeEntries[entryIndex] = {
      ...this.mockTimeEntries[entryIndex],
      ...entryData
    };
  }

  async deleteTimeEntry(id: number): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const entryIndex = this.mockTimeEntries.findIndex(entry => entry.id === id);
    if (entryIndex === -1) {
      throw new Error(`Time entry with id ${id} not found`);
    }
    
    this.mockTimeEntries.splice(entryIndex, 1);
  }

  // Additional helper methods
  getProjects(): Project[] {
    return [...this.mockProjects];
  }

  getAllSessions(): WorkSession[] {
    return [...this.mockWorkSessions];
  }

  getAllTimeEntries(): TimeEntry[] {
    return [...this.mockTimeEntries];
  }

  // Method to simulate the structure that the real service might return
  async findTimeEntries(criteria: { time_tracker_id: number }): Promise<TimeEntry[]> {
    return this.find(criteria);
  }
}