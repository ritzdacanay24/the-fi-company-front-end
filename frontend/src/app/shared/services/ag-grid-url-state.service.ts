import { Injectable } from "@angular/core";
import { Params } from "@angular/router";
import { GridApi } from "ag-grid-community";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

export interface AgGridUrlState {
  columnState?: any[];
  filterModel?: any;
  sortModel?: Array<{ colId: string; sort: "asc" | "desc"; sortIndex?: number }>;
  pivotMode?: boolean;
}

@Injectable({
  providedIn: "root",
})
export class AgGridUrlStateService {
  getStateFromGrid(api: GridApi | null | undefined): AgGridUrlState {
    if (!api) {
      return {};
    }

    const columnState = api.getColumnState?.() || undefined;
    const pivotMode = typeof api.isPivotMode === "function" ? api.isPivotMode() : undefined;

    const filterModel = api.getFilterModel?.() || undefined;
    const sortModel = api
      .getColumnState?.()
      ?.filter((col) => !!col.sort)
      .map((col) => ({
        colId: col.colId,
        sort: col.sort as "asc" | "desc",
        sortIndex: col.sortIndex,
      }));

    return {
      columnState,
      filterModel,
      sortModel,
      pivotMode,
    };
  }

  encodeState(state: AgGridUrlState | null | undefined): string | null {
    const hasColumnState = !!(state?.columnState?.length || 0);
    const hasFilterModel = !!Object.keys(state?.filterModel || {}).length;
    const hasSortModel = !!(state?.sortModel?.length || 0);
    const hasPivotMode = typeof state?.pivotMode === "boolean";

    if (!hasColumnState && !hasFilterModel && !hasSortModel && !hasPivotMode) {
      return null;
    }

    try {
      return compressToEncodedURIComponent(JSON.stringify(state));
    } catch {
      return null;
    }
  }

  decodeState(value: string | null | undefined): AgGridUrlState | null {
    if (!value) {
      return null;
    }

    try {
      const decompressed = decompressFromEncodedURIComponent(value);
      if (!decompressed) {
        return null;
      }

      return JSON.parse(decompressed) as AgGridUrlState;
    } catch {
      return null;
    }
  }

  decodeLegacyState(queryParams: Params): AgGridUrlState | null {
    const columnState = this.safeParseLegacy(queryParams["columnState"]);
    const filterModel = this.safeParseLegacy(queryParams["filterModel"]);
    const sortModel = this.safeParseLegacy(queryParams["sortModel"]);
    const pivotModeRaw = queryParams["pivotMode"];
    const pivotMode =
      pivotModeRaw === "true"
        ? true
        : pivotModeRaw === "false"
          ? false
          : undefined;

    if (
      !columnState &&
      !filterModel &&
      !(sortModel?.length || 0) &&
      typeof pivotMode !== "boolean"
    ) {
      return null;
    }

    return {
      columnState: columnState || undefined,
      filterModel: filterModel || undefined,
      sortModel: sortModel || undefined,
      pivotMode,
    };
  }

  applyStateToGrid(api: GridApi | null | undefined, state: AgGridUrlState | null | undefined): void {
    if (!api || !state) {
      return;
    }

    if (typeof state.pivotMode === "boolean") {
      api.setGridOption("pivotMode", state.pivotMode);
    }

    if (state.columnState?.length) {
      api.applyColumnState({
        state: state.columnState,
        applyOrder: true,
      });
    }

    if (state.filterModel) {
      api.setFilterModel(state.filterModel);
    }

    if (state.sortModel?.length) {
      api.applyColumnState({
        state: state.sortModel,
        defaultState: { sort: null },
      });
    }
  }

  private safeParseLegacy(value: unknown): any | null {
    if (!value || typeof value !== "string") {
      return null;
    }

    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      return null;
    }
  }
}
