import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

function getLegacyGridState(api: any) {
  const columnState = api?.getColumnState?.() || [];
  const sortModel = columnState
    .filter((col: any) => !!col.sort)
    .map((col: any) => ({
      colId: col.colId,
      sort: col.sort,
      sortIndex: col.sortIndex,
    }));

  return {
    columnState,
    filterModel: api?.getFilterModel?.() || {},
    sortModel,
  };
}

export function _compressToEncodedURIComponent(api) {
  if (!api) {
    return null;
  }

  try {
    const state =
      typeof api.getState === "function"
        ? api.getState()
        : getLegacyGridState(api);

    return compressToEncodedURIComponent(JSON.stringify(state));
  } catch {
    return null;
  }
}

export function _decompressFromEncodedURIComponent(data, params) {
  if (!data || !params?.api) {
    return;
  }

  try {
    const decoded = decompressFromEncodedURIComponent(data);
    if (!decoded) {
      return;
    }

    const state = JSON.parse(decoded);
    const api = params.api;

    if (typeof api.setState === "function") {
      api.setState(state);
      return;
    }

    if (Array.isArray(state?.columnState) && typeof api.applyColumnState === "function") {
      api.applyColumnState({
        state: state.columnState,
        applyOrder: true,
      });
    }

    if (state?.filterModel && typeof api.setFilterModel === "function") {
      api.setFilterModel(state.filterModel);
    }

    if (Array.isArray(state?.sortModel) && state.sortModel.length && typeof api.applyColumnState === "function") {
      api.applyColumnState({
        state: state.sortModel,
        defaultState: { sort: null },
      });
    }
  } catch {
    return;
  }
}
