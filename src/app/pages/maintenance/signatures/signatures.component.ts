import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { SharedModule } from "@app/shared/shared.module";
import { AgGridModule } from "ag-grid-angular";

import { AceModule } from "ngx-ace-wrapper";
import "brace";
import "brace/mode/plain_text";
import "brace/theme/merbivore_soft";
import "brace/theme/tomorrow";
import { RootReducerState } from "@app/store";
import { Store } from "@ngrx/store";
import { SignaturesService } from "@app/core/api/signatures.service";
import { SignaturesModalService } from "./signatures-modal/signatures-modal.component";
import { Pipe, PipeTransform } from "@angular/core";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { Clipboard } from "@angular/cdk/clipboard";
import html2canvas from "html2canvas";
import { SweetAlert } from "@app/shared/sweet-alert/sweet-alert.service";

@Pipe({
  standalone: true,
  name: "search",
})
export class SearchPipe implements PipeTransform {
  transform(items: any[], searchText: string): any[] {
    if (!items) return [];
    if (!searchText) return items;

    searchText = searchText.toLowerCase();

    return items.filter((item) => {
      return Object.values(item).some((value) => {
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchText);
        }
        return false;
      });
    });
  }
}

@Component({
  standalone: true,
  imports: [SharedModule, AgGridModule, AceModule, SearchPipe, ClipboardModule],
  selector: "app-signatures",
  templateUrl: "./signatures.component.html",
  styleUrls: ["./signatures.component.scss"],
})
export class SignaturesComponent implements OnInit {
  @ViewChild("screen") screen: ElementRef;
  @ViewChild("canvas") canvas: ElementRef;
  @ViewChild("downloadLink") downloadLink: ElementRef;

  constructor(
    private api: SignaturesService,
    private store: Store<RootReducerState>,
    private signaturesModalService: SignaturesModalService,
    private clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    this.getQueries();
  }

  @ViewChild("divToCopy") divToCopy: ElementRef;

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async copyAsImage(id, row) {
    SweetAlert.loading("Copying Image. Please wait..");
    await this.sleep(100);

    html2canvas(document.getElementById(id), {
      useCORS: false,
      scale: 2,
    }).then((canvas) => {
      canvas.toBlob(function (blob) {
        navigator.clipboard
          .write([
            new ClipboardItem(
              Object.defineProperty({}, blob.type, {
                value: blob,
                enumerable: true,
              })
            ),
          ])
          .then(function () {
            // do something
            SweetAlert.close();
          });
      });
    });
  }

  async copyText(id, row) {
    SweetAlert.loading("Downloading Image. Please wait..");
    await this.sleep(100);

    html2canvas(document.getElementById(id), { useCORS: false, scale: 2 }).then(
      (canvas) => {
        this.downloadLink.nativeElement.href = canvas
          .toDataURL("image/png")
          .replace("image/png", "image/octet-stream");
        this.downloadLink.nativeElement.download = row.Name + ".png";
        this.downloadLink.nativeElement.click();
        SweetAlert.close();
      }
    );
  }

  copyToClipboard(text: string) {
    console.log("sssss");
    // Implementation to copy text to clipboard
  }

  onCopy() {
    console.log("copied");
  }

  data: any;
  async getQueries() {
    this.data = await this.api.getAll();
  }

  loading: boolean;
  submit() {}

  edit(id?: any) {
    const modalRef = this.signaturesModalService.open(id);
    modalRef.result.then(
      async (result: any) => {
        if (!id) {
          this.searchByName = "";
          await this.getQueries();
          setTimeout(() => {
            window.scrollTo(0, document.body.scrollHeight);
          }, 500);
        } else {
          await this.getQueries();
        }
      },
      () => {}
    );
  }

  searchByName = "";

  search() {
    //let el = document.getElementById();

    let el = document.getElementById("test-" + this.searchByName.toString());

    console.log(this.searchByName);
    console.log(el);
    setTimeout(() => {
      el[0]?.scrollIntoView();
    }, 500);
  }
}
