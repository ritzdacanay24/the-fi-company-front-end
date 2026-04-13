export function queryString(params: any) {
  return '?' + new URLSearchParams(params).toString()
}
