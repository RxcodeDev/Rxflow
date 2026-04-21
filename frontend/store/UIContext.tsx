'use client';

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import uiReducer, { initialUiState } from './slices/uiSlice';
import type { UiState, UiAction } from './slices/uiSlice';

const UIStateCtx = createContext<UiState>(initialUiState);
const UIDispatchCtx = createContext<Dispatch<UiAction>>(() => {});

export function UIProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialUiState);
  return (
    <UIStateCtx.Provider value={state}>
      <UIDispatchCtx.Provider value={dispatch}>
        {children}
      </UIDispatchCtx.Provider>
    </UIStateCtx.Provider>
  );
}

export const useUIState = () => useContext(UIStateCtx);
export const useUIDispatch = () => useContext(UIDispatchCtx);
