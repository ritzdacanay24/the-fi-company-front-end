// export function currencyFormatter(params) {
//   var l = '';

//   var price = params.value;
//   if (price) {
//     l = formatter.format(price);
//   } else {
//     l = formatter.format(0.00);
//   }
//   return l;
// }

export function currencyFormatter(params: { data: any; hasOwnProperty: (arg0: string) => any; value: any; }) {
  var l = '';

  if (params.data) {
    if (params.hasOwnProperty('value')) {
      var price = params.value;
      if (price) {
        l = formatter.format(price);
      } else {
        l = formatter.format(0.00);
      }
      return l;
    } else {
      var price: any = params;
      if (price) {
        l = formatter.format(price);
      } else {
        l = formatter.format(0.00);
      }
      return l;
    }
  } else {
    return null
  }


}

export function numberWithCommas(x: { value: any; toString: () => string; }) {
  x = x?.value ? x.value : x;
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export function currency(value: any) {
  return formatter.format(value);
}


export function stripHtml(OriginalString: string) {
  return OriginalString.replace(/(<([^>]+)>)/ig, "").replace(/&nbsp;/gi, '');
}

export function secondsToHms(duration: number) {
  // Hours, minutes and seconds
  var hrs = ~~(duration / 3600);
  var mins = ~~((duration % 3600) / 60);
  var secs = ~~duration % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  var ret = "";

  if (hrs > 0) {
    ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  }

  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;
  return ret;
}


export function diff(start: any | Date | number[], end: any | Date | number[]) {
  start = start.split(":");
  end = end.split(":");
  var startDate = new Date(0, 0, 0, start[0], start[1], 0);
  var endDate = new Date(0, 0, 0, end[0], end[1], 0);
  var diff = endDate.getTime() - startDate.getTime();
  var hours = Math.floor(diff / 1000 / 60 / 60);
  diff -= hours * 1000 * 60 * 60;
  var minutes = Math.floor(diff / 1000 / 60);

  // If using time pickers with 24 hours format, add the below line get exact hours
  if (hours < 0)
    hours = hours + 24;

  return (hours <= 9 ? "0" : "") + hours + ":" + (minutes <= 9 ? "0" : "") + minutes;
}

export function getTimeDifference(date: string, time: any) {

  let then = date + ' ' + secondsToHms(time);
  var startTime = new Date(then);


  var difftm = diff(startTime, new Date());


  return difftm;
}

export function dateFormat(x: { getMonth: () => number; getDate: () => any; getHours: () => any; getMinutes: () => any; getSeconds: () => any; getFullYear: () => { (): any; new(): any; toString: { (): string | any[]; new(): any; }; }; }, y: any) {
  var z: any = {
    M: x.getMonth() + 1,
    d: x.getDate(),
    h: x.getHours(),
    m: x.getMinutes(),
    s: x.getSeconds()
  };
  y = y.replace(/(M+|d+|h+|m+|s+)/g, function (v: string) {
    return ((v.length > 1 ? "0" : "") + z[v.slice(-1)]).slice(-2)
  });

  return y.replace(/(y+)/g, (v: string | any[]) => {
    return x.getFullYear().toString().slice(-v.length)
  });
}

export function nFormatter(num: number, digits: number) {
  var si = [
    { value: 1, symbol: "" },
    { value: 1E3, symbol: "k" },
    { value: 1E6, symbol: "M" },
    { value: 1E9, symbol: "G" },
    { value: 1E12, symbol: "T" },
    { value: 1E15, symbol: "P" },
    { value: 1E18, symbol: "E" }
  ];
  var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var i;
  for (i = si.length - 1; i > 0; i--) {
    if (num >= si[i].value) {
      break;
    }
  }
  return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
}

export function sortChartHighToLow(data: any, label: string[]) {

  var arrayData = data;
  var arrayLabel = label;

  var arrayOfObj = arrayLabel.map(function (d, i) {
    return {
      label: d,
      data: arrayData[i] || 0,
    };
  });

  var sortedArrayOfObj = arrayOfObj.sort(function (a, b) {
    return b.data - a.data;
  });

  var newArrayLabel: string[] = [];
  var newArrayData: any[] = [];
  sortedArrayOfObj.forEach(function (d) {
    newArrayLabel.push(d.label);
    newArrayData.push(d.data);
  });

  let obj = {
    labels: newArrayLabel,
    values: newArrayData
  }
  return obj;
}

export function convertAnyToHttp(params: any): { [param: string]: string | string[]; } {
  params = Object.assign({}, params);
  Object.keys(params).forEach(key => {
    if (typeof params[key] === 'object') {
      params[key] = JSON.stringify(params[key]);
    } else if (!params[key]) {
      delete params[key];
    }
  });
  return params;
}

export function isJSON(str: string) {
  try {
    return (JSON.parse(str) && !!str);
  } catch (e) {
    return false;
  }
}

export function returnAvg(number: number, data: any) {
  var t = data;
  var field = [];
  for (var n = 0; n < number; ++n) {
    field.push(t);
  }
  return field;
}

export function isEmpty(obj: { hasOwnProperty: (arg0: string) => any; }) {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      return false;
    }
  }

  return JSON.stringify(obj) === JSON.stringify({});
}

export function getTimeOfDay() {
  var today = new Date()
  var curHr = today.getHours()
  let message = 'evening';

  if (curHr < 12) {
    message = 'morning';
  } else if (curHr < 18) {
    message = 'afternoon';
  }
  return message;
}

export function splitToArray(str: string, type: any) {
  return str.split(type);
}

export function copyOrigianlData(orignalData: any) {
  return Object.assign({}, orignalData)
}

export function convertToDateTimeLocal(date: string | number | Date) {
  if (!date) return null;

  var isoStr = new Date(date).toISOString();
  return isoStr.substring(0, isoStr.length - 1);
}

export function getBrowserVersion() {
  return (function () {
    var ua = navigator.userAgent, tem,
      M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
      tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
      return 'IE ' + (tem[1] || '');
    }
    if (M[1] === 'Chrome') {
      tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
      if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return M.join(' ');
  })();
}

export function convertToInternationalCurrencySystem(labelValue: any) {

  // Nine Zeroes for Billions
  return Math.abs(Number(labelValue)) >= 1.0e+9

    ? (Math.abs(Number(labelValue)) / 1.0e+9).toFixed(2) + "B"
    // Six Zeroes for Millions
    : Math.abs(Number(labelValue)) >= 1.0e+6

      ? (Math.abs(Number(labelValue)) / 1.0e+6).toFixed(2) + "M"
      // Three Zeroes for Thousands
      : Math.abs(Number(labelValue)) >= 1.0e+3

        ? (Math.abs(Number(labelValue)) / 1.0e+3).toFixed(2) + "K"

        : Math.abs(Number(labelValue));

}
