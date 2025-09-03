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
export class BlackRedLabelModalService {
  constructor(public modalService: NgbModal) { }

  open(data) {
    let modalRef = this.modalService.open(BlackRedLabelModalComponent, {
      size: "md",
    });
    modalRef.componentInstance.data = data;
    return modalRef;
  }
}

@Component({
  standalone: true,
  imports: [SharedModule],
  selector: "app-black-red-label-modal",
  templateUrl: "./black-red-modal.component.html",
  styleUrls: [],
})
export class BlackRedLabelModalComponent implements OnInit {
  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private ngbActiveModal: NgbActiveModal,
    private labelService: LabelService,
    private toastrService: ToastrService
  ) { }

  form = new FormGroup<any>({
    color: new FormControl("Black"), // Default to Black
    batchSize: new FormControl(4), // Default batch size
    totalBatches: new FormControl(1), // Number of times to repeat the batch
  });

  @Input() data: any;

  ngOnInit(): void { }

  getPreviewNumbers(): number[] {
    const batchSize = parseInt(this.form.value.batchSize) || 4;
    
    if (batchSize <= 0) return [];
    
    // Show the batch pattern (up to 10 numbers for display)
    const previewCount = Math.min(batchSize, 10);
    return Array.from({ length: previewCount }, (_, i) => i + 1);
  }

  getBatchInfo(): { totalBatches: number, batchSize: number, totalLabels: number } {
    const batchSize = parseInt(this.form.value.batchSize) || 4;
    const totalBatches = parseInt(this.form.value.totalBatches) || 1;
    
    const totalLabels = batchSize * totalBatches;
    
    return { totalBatches, batchSize, totalLabels };
  }

  dismiss() {
    this.ngbActiveModal.dismiss();
  }

  close() {
    this.ngbActiveModal.close();
  }

  async onPrint() {
    try {
      const color = this.form.value.color || 'Black';
      const batchSize = parseInt(this.form.value.batchSize) || 4;
      const totalBatches = parseInt(this.form.value.totalBatches) || 1;
      
      if (batchSize <= 0) {
        this.toastrService.error('Please enter a valid batch size greater than 0');
        return;
      }

      if (totalBatches <= 0) {
        this.toastrService.error('Please enter a valid number of batches greater than 0');
        return;
      }

      let cmds = "";
      
      // Generate batches - each batch repeats the same numbering (1, 2, 3, ...)
      for (let batch = 1; batch <= totalBatches; batch++) {
        
        // For each batch, print labels 1 through batchSize
        for (let labelNumber = 1; labelNumber <= batchSize; labelNumber++) {
          
          if (color.toUpperCase() === "BLACK") {
            cmds += `
^XA
^FO50,50^A0N,80,80
^FDBLACK ${labelNumber}^FS
^PQ1^FS
^XZ
^XA^XZ
EOL
            `;
          } else {
            cmds += `
^XA
^FO50,50^A0N,80,80
^FDRED^FS
^FO200,50^A0N,80,80
^FD${labelNumber}^FS
^PQ1^FS
^XZ
^XA^XZ
EOL
            `;
          }
        }
      }

      // Print the labels
      var printWindow = window.open("", "PRINT", "height=500,width=600");
      printWindow.document.write(cmds);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      
      // Show success message
      const totalLabels = batchSize * totalBatches;
      this.toastrService.success(
        `Successfully printed ${totalLabels} ${color.toLowerCase()} labels ` +
        `(${totalBatches} batch${totalBatches > 1 ? 'es' : ''} of ${batchSize} labels each)`
      );
      
      // Close modal after successful print
      this.close();
      
    } catch (err) {
      this.toastrService.error(err?.error || 'An error occurred while printing');
    }
  }
}
