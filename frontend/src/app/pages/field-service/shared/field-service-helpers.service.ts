import moment from "moment";
import 'moment-timezone';

export const AddToFieldServiceCalendar = 'AddToFieldServiceCalendar';

export const formateDate = (dateTime: string) => {
  return moment(dateTime, 'YYYY-MM-DD hh:mm');
}

export function getDatetimeDuration(
  start: moment.MomentInput,
  finish: moment.MomentInput,
  durationType: moment.unitOfTime.Base = 'minutes',
) {
  if (start && finish) {
    const duration = moment.duration(moment(finish).diff(moment(start)));

    let timeDuration: number | null = 0;

    if (durationType === 'minutes') {
      timeDuration = duration.asMinutes();
    } else if (durationType === 'hours') {
      timeDuration = duration.asHours();
    }

    return timeDuration;
  }

  return 0;
}

export function sumDatetime({
  start,
  finish,
  start_tz,
  finish_tz,
}: {
  start: moment.MomentInput;
  finish: moment.MomentInput;
  start_tz: string | null | undefined;
  finish_tz: string | null | undefined;
}) {
  if (!start || !finish) return 0;
  if (!start_tz || !finish_tz) return getDatetimeDuration(start, finish);

  let startTime = moment(start).tz(start_tz);
  let endTime = moment(finish).tz(finish_tz);

  let endTimeOffset = startTime.utcOffset();
  let startTimeOffset = endTime.utcOffset();

  startTime = moment.utc(startTime).utcOffset(endTimeOffset, true);
  endTime = moment.utc(endTime).utcOffset(startTimeOffset, true);

  return getDatetimeDuration(startTime, endTime);
}

export function timeConvert(n: number, type: 'short' | 'long' = 'short') {
  if (n === null) return 0;
  var num = n;
  let isNegative = '';

  if (num < 0) {
    isNegative = ' - ';
    num = Math.abs(num);
  }

  var hours = num / 60;

  var rhours = Math.floor(hours);
  var minutes = (hours - rhours) * 60;
  var rminutes = Math.round(minutes);
  let e = rminutes < 10 && type === 'short' ? '0' + rminutes : rminutes;

  // add s to the end of text if number is greater than 0
  let hourName = rhours > 1 ? ' hours ' : ' hour ';
  let minName = rminutes > 1 ? ' minutes ' : ' minute ';

  //if minutes > than 0, then include the minutes text.
  let title = rhours + hourName + ' and ' + e + minName;

  //if minutes equal to 0, then dont include the minutes text.
  if (rhours === 0) {
    title = e + minName;
  }

  //if minutes equal to 0, then dont include the minutes text.
  if (rminutes === 0) {
    title = rhours + hourName;
  }

  //preference to display long or short version of time.
  if (type === 'long') {
    return isNegative + title;
  } else if (type === 'short') {
    return isNegative + rhours + ':' + e;
  }

  return null;
}


export function calculateSummaryLabor(arrayData) {
  if (arrayData.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < arrayData.length; i++) {
    let hourDiff = 0
    if (arrayData[i].include_calculation == 1) {
      hourDiff += sumLaborAndBreakTimes({
        start: arrayData[i].projectStart,
        finish: arrayData[i].projectFinish,
        start_tz: arrayData[i].projectStartTz,
        finish_tz: arrayData[i].projectFinishTz,
        brStart: arrayData[i].brStart,
        brEnd: arrayData[i].brEnd,
      });
    }
    total += hourDiff;
  }

  return total;
}

export function sumLaborAndBreakTimes({
  start,
  finish,
  start_tz,
  finish_tz,
  brStart,
  brEnd,
}) {
  let total_break_mins = getDatetimeDuration(brStart, brEnd);

  let total_labor_mins = sumDatetime({
    start,
    finish,
    start_tz,
    finish_tz,
  });

  return total_labor_mins - total_break_mins;
}

export function sumLaborAndBreakTimesAndConvert({
  start,
  finish,
  start_tz,
  finish_tz,
  brStart,
  brEnd,
}) {
  let r = sumLaborAndBreakTimes({
    start,
    finish,
    start_tz,
    finish_tz,
    brStart,
    brEnd,
  })

  return timeConvert(r, 'short');
}

export function sumLaborAndBreakTimesAndConvertToQrtHrs({
  start,
  finish,
  start_tz,
  finish_tz,
  brStart,
  brEnd,
}) {
  let r = sumLaborAndBreakTimes({
    start,
    finish,
    start_tz,
    finish_tz,
    brStart,
    brEnd,
  })

  return r / 60
}

export function zoneAbbr(name: string) {
  if (name === '' || name === null) return null;
  return moment.tz(name).zoneName();
}

export const getTotalCount = (workInfo: string | any[], type = 'qtr_hrs') => {
  let results = {
    travel: 0,
    service: 0,
    break: 0,
    total: 0,
    totalLabor: 0
  }

  if (workInfo) {

    for (let i = 0; i < workInfo.length; i++) {

      if (workInfo[i].work_order_labor_type != -1 && workInfo[i].work_order_labor_type != 0) {
        results.total += workInfo[i].mins
      }

    }
  }

  return results;
}
