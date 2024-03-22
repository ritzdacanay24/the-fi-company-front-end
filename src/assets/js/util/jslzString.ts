import * as JSLZString from 'lz-string'

export function _compressToEncodedURIComponent(api, columnApi) {
  return JSLZString.compressToEncodedURIComponent(JSON.stringify({
    columnState: columnApi.getColumnState()
    , filterState: api.getFilterModel()
  }))
}

export function _decompressFromEncodedURIComponent(data, params) {
  if (data) {

    let e = JSON.parse(JSLZString.decompressFromEncodedURIComponent(data));

    if (e?.columnState)
      params.api.applyColumnState({
        state: e?.columnState,
        applyOrder: true,
      });

    if (e?.filterState)
      params.api.setFilterModel(e?.filterState);
  }
  return
}
