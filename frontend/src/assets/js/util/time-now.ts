import moment from "moment";

export const time_now = (format = "YYYY-MM-DD HH:mm:ss") => {
  return moment().format(format);
};
