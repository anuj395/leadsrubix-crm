import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { RootState } from '@/store'
import * as api from '../api/notificationApi'
import type { NotificationItem } from '../types/notification.types'

interface NotificationState {
  items: NotificationItem[]
  unreadCount: number
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  status: 'idle',
  error: null,
}

export const loadNotifications = createAsyncThunk(
  'notifications/load',
  async (limit: number | undefined, { rejectWithValue }) => {
    try {
      return await api.fetchNotifications(limit)
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load notifications.')
    }
  }
)

export const loadUnreadCount = createAsyncThunk(
  'notifications/loadUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      return await api.fetchUnreadCount()
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load unread count.')
    }
  }
)

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.markAsRead(id)
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to mark notification as read.')
    }
  }
)

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.markAllAsRead()
      return true
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to mark all as read.')
    }
  }
)

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    resetNotifications(state) {
      state.items = []
      state.unreadCount = 0
      state.status = 'idle'
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Load notifications
      .addCase(loadNotifications.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(loadNotifications.rejected, (state, action) => {
        state.status = 'failed'
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to load notifications.'
      })
      // Load unread count
      .addCase(loadUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload
      })
      // Mark single read
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => (item._id || item.id) === (action.payload._id || action.payload.id))
        if (index !== -1) {
          state.items[index].is_read = true
        }
        if (state.unreadCount > 0) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })
      // Mark all read
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach(item => {
          item.is_read = true
        })
        state.unreadCount = 0
      })
  }
})

export const { resetNotifications } = notificationSlice.actions

export const selectNotifications = (state: RootState) => state.notifications.items
export const selectUnreadCount = (state: RootState) => state.notifications.unreadCount
export const selectNotificationsStatus = (state: RootState) => state.notifications.status
export const selectNotificationsError = (state: RootState) => state.notifications.error

export const notificationReducer = notificationSlice.reducer
