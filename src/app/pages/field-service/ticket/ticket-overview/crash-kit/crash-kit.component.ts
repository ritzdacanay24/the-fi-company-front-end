import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { CrashKitService } from '@app/core/api/field-service/crash-kit.service';
import { NgbDatepickerModule, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { SweetAlert } from '@app/shared/sweet-alert/sweet-alert.service';

let list: any = [
  {
    pt_part: "ELE-45646-425",
    FULLDESC: "PWBA, LED Panel, P2.5 6X6, 64x64 Pixels, TAO"
  },
  {
    pt_part: "ELE-45619-296",
    FULLDESC: "PWBA, P3 192mmx96mm Curved LED Module"
  },
  {
    pt_part: "ELE-45624-025",
    FULLDESC: "PWBA,120mmx240mm,P2.5 Flexible LED Panel, 4x9"
  },
  {
    pt_part: "ELE-45624-080",
    FULLDESC: "PWBA, P2.5 240mm x 80mm LED Panel TP-240-80-C"
  },
  {
    pt_part: "ELE-42001-300",
    FULLDESC: "LED Panel Sending Card TC-MSD300"
  },
  {
    pt_part: "ELE-45700-100",
    FULLDESC: "PWBA, Receiving Card FCC - Class B"
  },
  {
    pt_part: "ELE-45700-200",
    FULLDESC: "PWBA, Receiving Card, 5As+, FCC - Class B"
  },
  {
    pt_part: "ELE-46500-015",
    FULLDESC: "ECUSBAB-5M USB 2.0 Data Cable 5M Length"
  },
  {
    pt_part: "ELE-46400-003",
    FULLDESC: "CBL Cat5 3' 350MHZ 5E Patch Cord 10X6-52103"
  },
  {
    pt_part: "ELE-46400-005",
    FULLDESC: "CBL CAT5e 350 MHZ Patch Cord 10X6-56105"
  },
  {
    pt_part: "ELE-46400-025",
    FULLDESC: "Cable Cat5 25' STP, Boot ed, 350MHZ"
  },
  {
    pt_part: "CBL-00275-008",
    FULLDESC: "CBL Data 16 Conductor Ribbon 8"
  },
  {
    pt_part: "CBL-00275-010",
    FULLDESC: "CBL, data, 16 conductor Ribbon 10"
  },
  {
    pt_part: "CBL-00275-012",
    FULLDESC: "CBL Data 16 Conductor Ribbon 12"
  },
  {
    pt_part: "CBL-00275-014",
    FULLDESC: "CBL Data 16 Conductor Ribbon 14"
  },
  {
    pt_part: "CBL-00275-016",
    FULLDESC: "CBL Data 16 Conductor Ribbon 16"
  },
  {
    pt_part: "ELE-46103-023",
    FULLDESC: "40291 HDMI to DVI-D MM CL2 Rated 23' Cable"
  },
  {
    pt_part: "ELE-46320-020",
    FULLDESC: "CBL HDMI/HDMI W/Active Chip 20' 10v3-21525+"
  },
  {
    pt_part: "ELE-46320-025",
    FULLDESC: "CBL HDMI/HDMI W/Active Chip 25' 10v3-21525+"
  },
  {
    pt_part: "ELE-45005-099",
    FULLDESC: "PWBA, 5-Amp Distribution Board (turtle Board)"
  },
  {
    pt_part: "ELE-46871-117",
    FULLDESC: "Adapter, Mini-DP/HDMI Active - Msft EJU-00001"
  },
  {
    pt_part: "ELE-46700-015",
    FULLDESC: "Adapter HDMI-F to DVI-M Dual Link - 24+1 L-Com"
  },
  {
    pt_part: "ELE-46203-016",
    FULLDESC: "CBL,15 FT,HDMI-DVI-D, M/M,CL-2 Rated,Monoprice"
  },
  {
    pt_part: "ELE-40005-300",
    FULLDESC: "DPS-300AB-96 Delta Power Supply 5Vdc 300W"
  },
  {
    pt_part: "ELE-40241-000",
    FULLDESC: "Power Supply 24Vdc 1000Watt RSP-1000-24"
  },
  {
    pt_part: "ELE-40012-161",
    FULLDESC: "Power Supply 12Vdc 60W Delta"
  },
  {
    pt_part: "ELE-42000-722",
    FULLDESC: "Splitter, 2-Port,HDMI"
  },
  {
    pt_part: "ELE-42000-900",
    FULLDESC: "HDMI Splitter 2x1 - 4K 30Hz, CDW P/N: 3638900"
  },
  {
    pt_part: "ELE-65103-453",
    FULLDESC: "Fuseholder, 3AG, 20A Pnl Mont, Littelfuse"
  },
  {
    pt_part: "ELE-6500-015",
    FULLDESC: ""
  },
  {
    pt_part: "KIT-00022-101",
    FULLDESC: "Kit, Media Player, Raspberry Pi"
  },
  {
    pt_part: "ELE-42900-032",
    FULLDESC: "SD Card, Micro, 32GB Scan Disk Ultra"
  },
]

@Component({
  standalone: true,
  imports: [SharedModule, NgbDatepickerModule, NgSelectModule],
  selector: 'app-crash-kit',
  templateUrl: `./crash-kit.component.html`,
})

export class CrashKitComponent implements OnInit {
  @Input() public workOrderId: string
  @Input() public disabled: boolean = true;
  closeResult = '';
  partSearch: any;


  editInfo: any = {
    id: "",
    part_number: null,
    qty: 1,
    work_order_id: null,
    price: null,
    description: ""
  }

  closeSelect(select: NgSelectComponent) { select.close(); }

  search = (e) => {
    this.editInfo.part_number = e
    this.searchPart()
  }

  detectChang = (e) => {
    this.editInfo.part_number = e.pt_part
    this.searchPart()
  }

  list = list

  ngOnChanges(changes: SimpleChanges) {
    if (changes['workOrderId']) {
      this.workOrderId = changes['workOrderId'].currentValue
      this.getData();
    }
  }

  constructor(
    public offcanvasService: NgbOffcanvas,
    public api: CrashKitService,
  ) {
  }

  ngOnInit() {
  }

  data: any = [];

  searchPart = async () => {
    try {
      SweetAlert.loading('Please wait while we validate this part number...')
      this.partSearch = await this.api.getByPartNumber(this.editInfo.part_number);
      if (!this.partSearch) {
        alert('This part number does not exist in QAD. Please enter valid part number');
        this.partSearch = "";
        SweetAlert.close(0)
      } else {
        this.editInfo.price = this.partSearch.PT_PRICE
        this.editInfo.description = this.partSearch.FULLDESC;
        SweetAlert.close(500)
      }
    } catch (err) {
      SweetAlert.close(0)
    }

  }

  loading = false
  async getData() {
    this.data = [];
    try {
      this.loading = true
      this.data = await this.api.getByWorkOrderId(this.workOrderId);
      this.loading = false;

      for (let i = 0; i < this.list.length; i++) {
        this.list[i].disabled = false;
        this.list[i].message = '';
        for (let ii = 0; ii < this.data.length; ii++) {
          if (this.list[i].pt_part == this.data[ii].part_number) {
            this.list[i].disabled = true;
            this.list[i].message = 'In crash kit';
          }

        }
      }

    } catch (err) {
      this.loading = false;
    }
  }

  async create(value?) {
    if (!this.partSearch) return;
    try {
      SweetAlert.loading()
      await this.api.create(this.editInfo);
      if (!value) {
        this.offcanvasService.dismiss('Save click');
      } else {
        this.clear()
      }

      this.getData()

      SweetAlert.close(500)
    } catch (err) {
      SweetAlert.close(0)
    }

  }

  async onDelete() {

    const { value: accept } = await SweetAlert.confirm();
    if (!accept) return;

    try {
      SweetAlert.loading('Deleting..')
      await this.api.deleteById(this.editInfo.id);
      this.offcanvasService.dismiss('Save click');
      this.getData();
      SweetAlert.close(500)
    } catch (err) {
      SweetAlert.close(0)
    }

  }

  async update(value?) {
    try {
      SweetAlert.loading()
      let id = this.editInfo.id;
      delete this.editInfo.id;
      await this.api.updateById(id, this.editInfo);
      this.offcanvasService.dismiss('Save click');
      this.getData()
      SweetAlert.close(500)
    } catch (err) {
      SweetAlert.close(0)
    }
  }

  onSubmit(value = false) {
    if (this.editInfo.id) {
      this.update(value)
    } else {
      this.create(value)
    }
  }

  clear() {
    this.editInfo = {
      id: "",
      part_number: null,
      qty: null,
      work_order_id: this.workOrderId,
      price: null,
      description: ""
    }
    this.partSearch = ""
  }

  open(content, row?) {
    this.editInfo = { ...row, work_order_id: this.workOrderId };

    this.offcanvasService.open(content, { ariaLabelledBy: 'offcanvas-basic-title', position: 'end', panelClass: 'crash-canvas-height', backdropClass: 'backdrop-crashserial-canvas-height-canvas' }).result.then(
      (result) => {
        this.closeResult = `Closed with: ${result}`;
        this.clear();
      },
      (reason) => {
        this.clear();
      },
    );
  }
}
