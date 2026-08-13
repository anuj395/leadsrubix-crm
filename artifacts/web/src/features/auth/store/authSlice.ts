import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { storage } from '@/services/storage'
import type { RootState } from '@/store'
import { resetSidebar } from '@/features/sidebar/store/sidebarSlice'

import { authService } from '../api/authService'
import type { AuthState, LoginCredentials, RegisterCredentials } from '../types/auth'

const initialSession = storage.getAuthSession()

const initialState: AuthState = {
  error: null,
  isAuthenticated: Boolean(initialSession),
  status: initialSession ? 'authenticated' : 'idle',
  token: initialSession?.token ?? null,
  user: initialSession?.user ?? null,
}

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      return await authService.login(credentials)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to authenticate.'
      return rejectWithValue(message)
    }
  },
)

// ── Register ──────────────────────────────────────────────────────────────────
export const register = createAsyncThunk(
  'auth/register',
  async (payload: any, { rejectWithValue }) => {
    try {
      return await authService.register(payload)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create account.'
      return rejectWithValue(message)
    }
  },
)

// ── Logout — thunk so we can reset sidebar slice atomically ───────────────────
export const logout = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  dispatch(resetSidebar())   // clear sidebar state + localStorage cache
  storage.clearAuthSession()
})

// ── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
    },
    updateUser(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
      const session = storage.getAuthSession()
      if (session) {
        session.user = { ...session.user, ...action.payload }
        storage.setAuthSession(session)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.error = null
        state.status = 'loading'
      })
      .addCase(login.fulfilled, (state, action) => {
        state.error = null
        state.isAuthenticated = true
        state.status = 'authenticated'
        state.token = action.payload.token
        state.user = action.payload.user
        storage.setAuthSession(action.payload)
      })
      .addCase(login.rejected, (state, action) => {
        state.error = typeof action.payload === 'string' ? action.payload : 'Authentication failed.'
        state.status = 'idle'
      })
      // Register
      .addCase(register.pending, (state) => {
        state.error = null
        state.status = 'loading'
      })
      .addCase(register.fulfilled, (state, action) => {
        state.error = null
        state.isAuthenticated = true
        state.status = 'authenticated'
        state.token = action.payload.token
        state.user = action.payload.user
        storage.setAuthSession(action.payload)
      })
      .addCase(register.rejected, (state, action) => {
        state.error = typeof action.payload === 'string' ? action.payload : 'Account creation failed.'
        state.status = 'idle'
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.error = null
        state.isAuthenticated = false
        state.status = 'idle'
        state.token = null
        state.user = null
      })
  },
})

export const { clearAuthError, updateUser } = authSlice.actions
export const authReducer = authSlice.reducer
export const selectAuth = (state: RootState) => state.auth
