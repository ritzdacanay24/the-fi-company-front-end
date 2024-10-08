import { Component } from "@angular/core";
import { ICellRendererAngularComp } from "ag-grid-angular";
import { ICellRendererParams } from "ag-grid-community";

@Component({
  selector: "employee-cell-renderer",
  standalone: true,
  template: `
    <div class="employeeCell">
      <div class="employeeData">
        <span>{{ value }}</span>
        <!-- <span class="description">{{ jobTitle }}</span> -->
      </div>
      <img
        class="rounded pointer employee-image"
        [src]="image || 'assets/images/default-user.png'"
        [alt]="value?.toLowerCase()"
        style="margin-bottom:2px !important;width:24px"
      />
    </div>
  `,
  styles: [
    `

      .employeeCell {
        display: flex;
        flex-direction: row-reverse;
        align-items: center;
        justify-content: left;
        gap: 8px;
      }

      .employeeCell img {
        padding: 2px;
      }

      .employeeData {
        display: flex;
        flex-direction: column;
      }

      .employeeData span:first-child {
        font-weight: 500;
      }

      .description {
        opacity: 0.6;
      }

      .employeeData > span {
        line-height: 20px;
      }

      .employeeName {
        font-weight: 600;
        color: rgb(50, 50, 50);
      }

      .image {
        width: 36px;
        height: 36px;
        margin-right: 5px;
        border-radius: 100px;
      }
    `,
  ],
})
export class EmployeeCellRenderer implements ICellRendererAngularComp {
  public value?: string;
  public image?: string;
  public jobTitle?: string;

  agInit(params: ICellRendererParams): void {
    this.value = params.value;
    this.image = params.data?.image;
    this.jobTitle = params.data?.title;
  }

  refresh(params: ICellRendererParams): boolean {
    this.value = params.value;
    this.image = params.data.image;
    this.jobTitle = params.data.jobTitle;
    return true;
  }
}
