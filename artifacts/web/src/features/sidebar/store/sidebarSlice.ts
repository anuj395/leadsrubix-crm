import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { RootState } from '@/store'
import { fetchSidebarMenu, clearSidebarCache } from '../api/sidebarApi'
import { mapApiMenusToNavItems } from '../utils/menuMapper'
import type { SidebarNavItem } from '../types/sidebar.types'

// ── State ─────────────────────────────────────────────────────────────────────
interface SidebarState {
  items: SidebarNavItem[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: SidebarState = {
  items: [],
  status: 'idle',
  error: null,
}

// ── Async thunk ───────────────────────────────────────────────────────────────
export const loadSidebarMenu = createAsyncThunk(
  'sidebar/loadMenu',
  async ({ industryId, role, organizationId }: { industryId: string; role: string; organizationId?: string }, { rejectWithValue }) => {
    try {
      const raw = await fetchSidebarMenu(industryId, role, organizationId)
      return mapApiMenusToNavItems(raw, role)
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load sidebar.')
    }
  },
)

// ── Slice ─────────────────────────────────────────────────────────────────────
const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    resetSidebar(state) {
      state.items = []
      state.status = 'idle'
      state.error = null
      clearSidebarCache()
    },
    setSidebarItems(state, action: { payload: SidebarNavItem[] }) {
      state.items = action.payload
      state.status = 'succeeded'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSidebarMenu.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadSidebarMenu.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(loadSidebarMenu.rejected, (state, action) => {
        state.status = 'failed'
        state.error = typeof action.payload === 'string' ? action.payload : 'Unknown error.'
        state.items = []
      })
  },
})

// ── Exports ───────────────────────────────────────────────────────────────────
export const { resetSidebar, setSidebarItems } = sidebarSlice.actions

export const selectSidebarItems  = (state: RootState) => state.sidebar.items
export const selectSidebarStatus = (state: RootState) => state.sidebar.status
export const selectSidebarError  = (state: RootState) => state.sidebar.error
export const selectSidebarLoading = (state: RootState) => state.sidebar.status === 'loading'

export const sidebarReducer = sidebarSlice.reducer
