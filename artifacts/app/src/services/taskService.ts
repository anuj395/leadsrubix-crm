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
  project?: string;
}

export const taskService = {
  async getTasks(params?: { completed?: boolean }): Promise<TaskItem[]> {
    try {
      const search = new URLSearchParams();
      if (params?.completed !== undefined) search.set('completed', String(params.completed));
      const qs = search.toString();

      const res = await apiClient.get(`/tasks${qs ? `?${qs}` : ''}`);
      const items = res.data?.items || res.data?.tasks || res.data || [];

      return items.map((t: any) => ({
        id: t._id || t.id,
        _id: t._id || t.id,
        title: t.title || t.name || 'Follow-up Site Visit',
        dueDate: t.dueDate || t.due_date || 'Today, 4:00 PM',
        priority: t.priority || 'High',
        isCompleted: Boolean(t.isCompleted || t.completed),
        leadName: t.leadName || t.lead_name || 'Rajesh Kumar',
        project: t.project || 'Grand Horizon Towers',
      }));
    } catch (err) {
      console.warn('[taskService] Failed to fetch tasks from backend API, using fallback data:', err);
      return [
        {
          id: '1',
          title: 'Schedule Site Visit Tour for Rajesh Kumar',
          dueDate: 'Today, 4:00 PM',
          priority: 'High',
          isCompleted: false,
          leadName: 'Rajesh Kumar',
          project: 'Grand Horizon Towers',
        },
        {
          id: '2',
          title: 'Send Cost Breakdown Sheet to Sunita Sharma',
          dueDate: 'Today, 6:30 PM',
          priority: 'Medium',
          isCompleted: false,
          leadName: 'Sunita Sharma',
          project: 'Rubix Empire Estates',
        },
        {
          id: '3',
          title: 'Confirm Commercial Booking Contract with Amitabh',
          dueDate: 'Tomorrow, 11:00 AM',
          priority: 'High',
          isCompleted: true,
          leadName: 'Amitabh Verma',
          project: 'Skyline Business Park',
        },
      ];
    }
  },

  async createTask(taskData: Partial<TaskItem>): Promise<TaskItem> {
    const res = await apiClient.post('/tasks', taskData);
    return res.data;
  },

  async toggleTaskCompletion(id: string, isCompleted: boolean): Promise<TaskItem> {
    try {
      const res = await apiClient.put(`/tasks/${id}`, { isCompleted, completed: isCompleted });
      return res.data;
    } catch (err) {
      console.warn('[taskService] Failed to update task completion on server:', err);
      return { id, title: '', dueDate: '', priority: 'Medium', isCompleted };
    }
  },
};
