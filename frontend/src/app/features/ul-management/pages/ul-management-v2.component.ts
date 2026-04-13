import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { faker } from '@faker-js/faker';

export interface SimpleULLabel {
  id: number;
  ul_number: string;
  description?: string;
  status: 'active' | 'used' | 'expired';
}

export interface SimpleULRange {
  id: number;
  start: string;
  end: string;
  note?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgIf, NgFor],
  selector: 'app-ul-management-v2',
  templateUrl: './ul-management-v2.component.html',
  styleUrls: ['./ul-management-v2.component.scss']
})
export class ULManagementV2Component {
  labels: SimpleULLabel[] = [];
  ranges: SimpleULRange[] = [];
  nextId = 1;
  form: FormGroup;
  storageKey = 'ulv2_state_v1';

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      ul_number: ['', Validators.required],
      description: ['']
    });

  // load state or preload a few fake labels
  this.loadState() || this.bulkGenerate(8);
  }

  bulkGenerate(count: number) {
    for (let i = 0; i < count; i++) {
      this.labels.push(this.makeFakeLabel());
    }
  }

  makeFakeLabel(): SimpleULLabel {
  // create a 10-digit UL-like number starting with 7390
  const num = faker.number.int({ min: 0, max: 999999 });
  const padded = String(num).padStart(6, '0');
  const ul = `7390${padded}`;
    const label: SimpleULLabel = {
      id: this.nextId++,
      ul_number: ul,
      description: faker.commerce.productName(),
      status: 'active'
    };
    return label;
  }

  addManual() {
    if (this.form.valid) {
      const val = this.form.value;
      this.labels.unshift({
        id: this.nextId++,
        ul_number: val.ul_number,
        description: val.description,
        status: 'active'
      });
      this.form.reset();
  this.saveState();
    } else {
      this.form.markAllAsTouched();
    }
  }

  markUsed(label: SimpleULLabel) {
    label.status = 'used';
  }

  importRange(start: string, end: string) {
    // Keep it simple: save the range as a single record rather than expanding all items.
    if (!start || !end) return;
    this.ranges.unshift({
      id: this.nextId++,
      start: start,
      end: end,
      note: 'Imported range (saved as range)'
    });
    this.saveState();
  }

  saveState() {
    try {
      const state = { labels: this.labels, ranges: this.ranges, nextId: this.nextId };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      // ignore localStorage errors silently
      console.warn('Unable to save UL v2 state', e);
    }
  }

  loadState(): boolean {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return false;
      const state = JSON.parse(raw);
      this.labels = state.labels || [];
      this.ranges = state.ranges || [];
      this.nextId = state.nextId || this.nextId;
      return true;
    } catch (e) {
      console.warn('Unable to load UL v2 state', e);
      return false;
    }
  }

  exportCSV() {
    const rows = this.labels.map(l => `${l.id},${l.ul_number},"${(l.description||'').replace(/"/g,'""')}",${l.status}`);
    const csv = ['id,ul_number,description,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ul-labels.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  copyAvailableToClipboard() {
    const items = this.labels.filter(l => l.status === 'active').map(l => l.ul_number).join('\n');
    navigator.clipboard?.writeText(items).catch(err => console.warn('clipboard failed', err));
  }

  availableCount(): number {
    return this.labels.filter(l => l.status === 'active').length;
  }
}
