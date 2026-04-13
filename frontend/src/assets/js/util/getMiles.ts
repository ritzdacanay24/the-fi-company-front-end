export function getMiles(meters, fixed = false) {
  return !fixed
    ? meters * 0.000621371192
    : (meters * 0.000621371192).toFixed(1);
}
