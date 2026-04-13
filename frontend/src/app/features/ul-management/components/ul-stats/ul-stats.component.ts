import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ULStats {
  total: number;
  available: number;
  assigned: number;
  used: number;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-ul-stats',
  templateUrl: './ul-stats.component.html',
  styleUrls: ['./ul-stats.component.scss']
})
export class ULStatsComponent {
  @Input() stats: ULStats = {
    total: 0,
    available: 0,
    assigned: 0,
    used: 0
  };
}
