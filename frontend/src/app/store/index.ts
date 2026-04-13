import { ActionReducerMap } from "@ngrx/store";
import { LayoutState, layoutReducer } from "./layouts/layout-reducers";

// import { authenticationReducer, AuthenticationState } from "./Authentication/authentication.reducer";

export interface RootReducerState {
  layout: LayoutState;

  // authentication: AuthenticationState;
}

export const rootReducer: ActionReducerMap<RootReducerState> = {
  layout: layoutReducer,

  // authentication: authenticationReducer,
};
