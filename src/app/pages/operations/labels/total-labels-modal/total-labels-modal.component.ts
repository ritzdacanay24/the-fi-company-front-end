import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { SharedModule } from "@app/shared/shared.module";
import { Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormControl, FormGroup } from "@angular/forms";
import { LabelService } from "@app/core/api/labels/label.service";
import { ToastrService } from "ngx-toastr";

@Injectable({
  providedIn: "root",
})
export class TotalLabelsModalService {
  constructor(public modalService: NgbModal) { }

  open(data) {
    let modalRef = this.modalService.open(TotalLabelsModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-total-labels",
  templateUrl: "./total-labels-modal.component.html",
  styleUrls: [],
})
export class TotalLabelsModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private labelService: LabelService,
    private toastrService: ToastrService
  ) { }

  form = new FormGroup<any>({
    start_number: new FormControl(""),
    total_labels: new FormControl(''),
    uom: new FormControl('Pallets'),
    total_batches: new FormControl(1),
  });

  @Input() data: any;

  ngOnInit(): void { }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  onPrint() {
    const row = this.form.value;

    const parsed = this.parseRangeOrCount(
      String(row.total_labels ?? ''),
      Number(row.start_number ?? 0)
    );

    if (!parsed) {
      this.toastrService.error('Enter Total Labels as a number (e.g. 7) or range (e.g. 1-7).');
      return;
    }

    const totalBatches = Math.max(1, Number(row.total_batches ?? 1) || 1);
    const rangeStart = parsed.start;
    const rangeEnd = parsed.end;
    const labelsPerBatch = rangeEnd - rangeStart + 1;

    let cmds = '';

    // Each batch intentionally restarts from the same range start.
    for (let batch = 1; batch <= totalBatches; batch++) {
      let currentNumber = rangeStart;

      for (let i = 0; i < labelsPerBatch; i++) {
        cmds += `
        ^XA
        ^FWR
        ^FO340,180^A0,400, 170^FD ${currentNumber < 10 ? `0${currentNumber}` : currentNumber} ^FS
        ^FO340,470^A0,400, 180^FD of ^FS
        ^FO340,710^A0,400, 180^FD ${rangeEnd < 10 ? `0${rangeEnd}` : rangeEnd} ^FS
        ${row.uom == 'Pallets' ? '^FO0,300^A0,400, 180^FD Pallets ^FS' : '^FO0,320^A0,400, 180^FD Boxes ^FS'}
        ^XZ
    `;

        currentNumber++;
      }
    }

    setTimeout(() => {
      var printwindow = window.open("", "PRINT", "height=500,width=600");
      printwindow.document.write(cmds);
      printwindow.document.close();
      printwindow.focus();
      printwindow.print();
      printwindow.close();
      this.toastrService.success(
        `Printed successfully: ${totalBatches} batch${totalBatches > 1 ? 'es' : ''} of ${labelsPerBatch} labels (${rangeStart}-${rangeEnd})`
      );
    }, 200);

  }

  private parseRangeOrCount(totalLabelsRaw: string, startNumberRaw: number): { start: number; end: number } | null {
    const text = String(totalLabelsRaw || '').trim();
    if (!text) {
      return null;
    }

    const rangeMatch = text.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end < start) {
        return null;
      }
      return { start, end };
    }

    const count = Number(text);
    const start = Number(startNumberRaw || 0);
    if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(start) || start <= 0) {
      return null;
    }

    return {
      start,
      end: start + count - 1
    };
  }
}
