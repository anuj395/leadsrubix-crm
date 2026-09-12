import { apiClient } from '../api/apiClient';
import { taskRepository } from '../repositories/taskRepository';

export interface TaskItem {
  id: string;
  _id?: string;
  title: string;
  dueDate: string;
  rawDueDate?: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  isCompleted: boolean;
  completed?: boolean;
  leadId?: string;
  contactId?: string;
  leadName?: string;
  customerName?: string;
  phone?: string;
  contactNumber?: string;
  email?: string;
  project?: string;
  projectName?: string;
  type?: string;
  taskType?: string;
  source?: string;
  notes?: string;
  status?: string;
  callbackReason?: string;
  call_back_reason?: string;
  urgency: 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED';
  urgencyLabel: string;
  overdueDays?: number;
  assignedTo?: string;
  contactOwnerEmail?: string;
  location?: string;
  meetingLocation?: string;
  meetingLink?: string;
  demoLink?: string;
  latitude?: number;
  longitude?: number;
}

export function formatTaskItem(t: any): TaskItem {
  const rawDate = t.dueDate || t.due_date || t.nextFollowUp || t.next_follow_up_date_time;
  let formattedDate = 'Today';
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  const isCompleted =
    String(t.status || '').toUpperCase() === 'COMPLETED' ||
    Boolean(t.isCompleted || t.completed);

  let urgency: 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED' = 'UPCOMING';
  let urgencyLabel = 'Upcoming';
  let overdueDays = 0;

  if (rawDate) {
    const d = new Date(rawDate);
    const time = d.getTime();
    if (!isNaN(time)) {
      formattedDate = d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      if (isCompleted) {
        urgency = 'COMPLETED';
        urgencyLabel = 'Completed';
      } else if (time < todayStart) {
        urgency = 'OVERDUE';
        overdueDays = Math.max(1, Math.floor((todayStart - time) / (24 * 60 * 60 * 1000)));
        urgencyLabel = overdueDays === 1 ? 'Due Yesterday' : `${overdueDays}d Overdue`;
      } else if (time >= todayStart && time < todayEnd) {
        urgency = 'TODAY';
        urgencyLabel = 'Due Today';
      } else {
        urgency = 'UPCOMING';
        const daysAhead = Math.ceil((time - todayEnd) / (24 * 60 * 60 * 1000));
        urgencyLabel = daysAhead <= 1 ? 'Tomorrow' : `In ${daysAhead} days`;
      }
    }
  } else if (isCompleted) {
    urgency = 'COMPLETED';
    urgencyLabel = 'Completed';
  }

  const priorityVal = String(t.priority || 'Medium').toLowerCase();
  const priority: 'Urgent' | 'High' | 'Medium' | 'Low' =
    priorityVal === 'urgent'
      ? 'Urgent'
      : priorityVal === 'high'
      ? 'High'
      : priorityVal === 'low'
      ? 'Low'
      : 'Medium';

  return {
    id: t._id || t.id,
    _id: t._id || t.id,
    title: t.title || t.type || t.taskType || t.task_type || 'Scheduled Follow-up',
    dueDate: formattedDate,
    rawDueDate: rawDate ? String(rawDate) : undefined,
    priority,
    isCompleted,
    leadId: t.leadId || t.lead_id || t.contactId || t.contact_id || t.lead?._id || t.lead?.id || t.customer_id || t.customerId || undefined,
    contactId: t.contactId || t.contact_id || t.leadId || t.lead_id || undefined,
    leadName: t.customerName || t.customer_name || t.leadName || t.clientName || 'Client',
    customerName: t.customerName || t.customer_name || t.leadName || 'Client',
    phone: t.contactNumber || t.contact_number || t.phone || '',
    contactNumber: t.contactNumber || t.contact_number || t.phone || '',
    email: t.email || t.leadEmail || t.lead_email || t.lead?.email || '',
    project: t.projectName || t.project_name || t.project || '',
    projectName: t.projectName || t.project_name || t.project || '',
    type: t.type || t.taskType || t.task_type || '',
    taskType: t.taskType || t.task_type || t.type || '',
    source: t.source || t.leadSource || t.lead_source || t.lead?.source || t.lead?.lead_source || 'Self Generated',
    notes: t.notes || t.description || t.note || '',
    status: isCompleted ? 'COMPLETED' : (t.status || 'PENDING'),
    callbackReason: t.callbackReason || t.call_back_reason || t.reason || undefined,
    call_back_reason: t.call_back_reason || t.callbackReason || t.reason || undefined,
    urgency,
    urgencyLabel,
    overdueDays,
    assignedTo: t.assignedTo || t.assigned_to || t.contactOwnerEmail || t.contact_owner_email || '',
    contactOwnerEmail: t.contactOwnerEmail || t.contact_owner_email || t.assignedTo || t.assigned_to || '',
    location: t.location || t.meetingLocation || t.meeting_location || '',
    meetingLocation: t.meetingLocation || t.meeting_location || t.location || '',
    meetingLink: t.meetingLink || t.meeting_link || t.demoLink || t.demo_link || '',
    demoLink: t.demoLink || t.demo_link || t.meetingLink || t.meeting_link || '',
    latitude: t.latitude !== undefined ? Number(t.latitude) : undefined,
    longitude: t.longitude !== undefined ? Number(t.longitude) : undefined,
  };
}

export const taskService = {
  async getTasks(params?: {
    completed?: boolean;
    status?: string;
    onlyMyTasks?: boolean;
    userEmail?: string;
    contactId?: string;
  }): Promise<TaskItem[]> {
    try {
      const search = new URLSearchParams();
      if (params?.completed !== undefined) search.set('completed', String(params.completed));
      if (params?.status) search.set('status', params.status);
      if (params?.contactId) {
        search.set('contactId', params.contactId);
        search.set('contact_id', params.contactId);
      }
      const qs = search.toString();

      const res = await taskRepository.fetchRawTasks(qs);
      const items = res?.items || res?.tasks || res || [];

      if (!Array.isArray(items)) return [];

      let formatted = items.map((t: any) => formatTaskItem(t));

      if (params?.onlyMyTasks && params?.userEmail) {
        const emailLower = params.userEmail.toLowerCase();
        formatted = formatted.filter((t) => {
          const owner = (t.assignedTo || t.contactOwnerEmail || '').toLowerCase();
          return owner.includes(emailLower);
        });
      }

      return formatted;
    } catch (err) {
      console.warn('[taskService] Error loading tasks from backend:', err);
      return [];
    }
  },

  async getTaskById(id: string): Promise<TaskItem | null> {
    try {
      const res = await taskRepository.getRawTaskById(id);
      const item = res?.task || res?.item || res;
      if (!item) return null;
      return formatTaskItem(item);
    } catch (err) {
      console.error('[taskService] Failed to get task by id:', err);
      return null;
    }
  },

  async createTask(task: Partial<any>): Promise<TaskItem | null> {
    try {
      const res = await taskRepository.createRawTask(task);
      const item = res?.task || res?.item || res;
      return item ? formatTaskItem(item) : null;
    } catch (err) {
      console.error('[taskService] Failed to create task:', err);
      return null;
    }
  },

  async updateTask(id: string, updates: Record<string, any>): Promise<boolean> {
    try {
      await taskRepository.updateRawTask(id, updates);
      return true;
    } catch (err) {
      console.error('[taskService] Failed to update task:', err);
      return false;
    }
  },

  async rescheduleTask(
    id: string,
    newDueDate: string,
    reason?: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const payload: Record<string, any> = {
        dueDate: newDueDate,
        due_date: newDueDate,
        status: 'PENDING',
        isCompleted: false,
      };
      if (reason) {
        payload.callbackReason = reason;
        payload.call_back_reason = reason;
      }
      if (notes) {
        payload.notes = notes;
      }
      await taskRepository.updateRawTask(id, payload);
      return true;
    } catch (err) {
      console.error('[taskService] Failed to reschedule task:', err);
      return false;
    }
  },

  async deleteTask(id: string): Promise<boolean> {
    try {
      await taskRepository.deleteRawTask(id);
      return true;
    } catch (err) {
      console.error('[taskService] Failed to delete task:', err);
      return false;
    }
  },

  async toggleTaskCompletion(id: string, isCompleted: boolean): Promise<boolean> {
    try {
      await taskRepository.updateRawTask(id, {
        status: isCompleted ? 'COMPLETED' : 'PENDING',
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : undefined,
      });
      return true;
    } catch (err) {
      console.error('[taskService] Failed to toggle task completion:', err);
      return false;
    }
  },

  async resolvePreviousTask(taskId: string, status: 'COMPLETED' | 'CANCELLED'): Promise<boolean> {
    try {
      await taskRepository.updateRawTask(taskId, {
        status,
        isCompleted: status === 'COMPLETED',
        completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined,
      });
      return true;
    } catch (err) {
      console.warn('[taskService] Failed to resolve previous task:', err);
      return false;
    }
  },

  async updateUniqueTaskType(id: string, uniqueMeeting: boolean, uniqueSiteVisit: boolean): Promise<boolean> {
    try {
      await apiClient.post('/tasks/uniqueTaskTypeUpdate', {
        id,
        unique_meeting: uniqueMeeting,
        unique_site_visit: uniqueSiteVisit,
      });
      return true;
    } catch (err) {
      console.warn('[taskService] Failed to update unique task type:', err);
      return false;
    }
  },
};
