import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  standalone: true,
  name: "sortBydate",
})
export class SortBydatePipe implements PipeTransform {
  transform(value: any, key?: any): any {
    return value?.sort(
      (a: any, b: any) =>
        new Date(a[key]).getTime() - new Date(b[key]).getTime()
    );
  }
}
