import { Pipe, Injectable, PipeTransform } from "@angular/core";
import moment from "moment";

@Pipe({ name: "dateTimeFormatFilter", standalone: true })
@Injectable()
export class DateTimeFormatPipe implements PipeTransform {
  transform(date: any, format: string): any {
    if (date) {
      return moment(date).format(format);
    }
  }
}
