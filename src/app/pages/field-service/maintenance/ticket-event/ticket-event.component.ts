import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: 'app-ticket-event',
  templateUrl: './ticket-event.component.html',
  styleUrls: []
})
export class TicketEventComponent implements OnInit {

  constructor(
    public route: ActivatedRoute,
    public router: Router
  ) {
  }

  ngOnInit(): void {
  }

  title: string = 'Ticket Event Types';

  icon = 'mdi-cogs';
}
