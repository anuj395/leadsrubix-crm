import { combineReducers } from '@reduxjs/toolkit'
import { authReducer } from '@/features/auth'
import { sidebarReducer } from '@/features/sidebar/store/sidebarSlice'
import { notificationReducer } from '@/features/notifications/store/notificationSlice'

export const rootReducer = combineReducers({
  auth: authReducer,
  sidebar: sidebarReducer,
  notifications: notificationReducer,
})
