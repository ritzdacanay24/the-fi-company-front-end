import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  standalone: true,
  name: "filter",
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], filter: string): any {
    if (!items || !filter) {
      return items;
    }
    // filter items array, items which match and return true will be
    // kept, false will be filtered out
    return items.filter((item) => {
      return item["name"]?.toLowerCase().indexOf(filter?.toLowerCase()) !== -1;
    });
  }
}
