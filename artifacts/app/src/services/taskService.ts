import { apiClient } from '../api/apiClient';

export interface TaskItem {
  id: string;
  _id?: string;
  title: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  isCompleted: boolean;
  completed?: boolean;
  leadName?: string;
  phone?: string;
  project?: string;
  projectName?: string;
  type?: string;
}

export const taskService = {
  async getTasks(params?: { completed?: boolean; status?: string }): Promise<TaskItem[]> {
    try {
      const search = new URLSearchParams();
      if (params?.completed !== undefined) search.set('completed', String(params.completed));
      if (params?.status) search.set('status', params.status);
      const qs = search.toString();

      const res = await apiClient.get(`/tasks${qs ? `?${qs}` : ''}`);
      const items = res.data?.items || res.data?.tasks || res.data || [];

      if (!Array.isArray(items)) return [];

      return items.map((t: any) => {
        let formattedDate = 'Today';
        if (t.dueDate || t.due_date || t.nextFollowUp) {
          const d = new Date(t.dueDate || t.due_date || t.nextFollowUp);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          }
        }

        return {
          id: t._id || t.id,
          _id: t._id || t.id,
          title: t.title || t.type || t.taskType || 'Scheduled Follow-up',
          dueDate: formattedDate,
          priority: t.priority || 'High',
          isCompleted:
            String(t.status || '').toUpperCase() === 'COMPLETED' ||
            Boolean(t.isCompleted || t.completed),
          leadName: t.customerName || t.customer_name || t.leadName || 'Client',
          phone: t.contactNumber || t.contact_number || t.phone || '',
          project: t.projectName || t.project_name || t.project || '',
          projectName: t.projectName || t.project_name || t.project || '',
          type: t.type || t.taskType || '',
        };
      });
    } catch (err) {
      console.warn('[taskService] Error loading tasks from backend:', err);
      return [];
    }
  },

  async createTask(task: Partial<TaskItem>): Promise<TaskItem | null> {
    try {
      const res = await apiClient.post('/tasks', task);
      return res.data;
    } catch (err) {
      console.error('[taskService] Failed to create task:', err);
      return null;
    }
  },

  async toggleTaskCompletion(id: string, isCompleted: boolean): Promise<boolean> {
    try {
      await apiClient.put(`/tasks/${id}`, {
        status: isCompleted ? 'COMPLETED' : 'PENDING',
        isCompleted,
      });
      return true;
    } catch (err) {
      console.error('[taskService] Failed to toggle task completion:', err);
      return false;
    }
  },
};
