import { writable, derived, get } from 'svelte/store';
import { db, type Task } from '../db/database';

function createTasksStore() {
  const { subscribe, set, update } = writable<Task[]>([]);

  return {
    subscribe,
    async loadByProject(projectId: number) {
      const tasks = await db.tasks.where('projectId').equals(projectId).toArray();
      set(tasks.sort((a, b) => a.order - b.order));
    },
    async add(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) {
      const existingTasks = get(this);
      const maxOrder = existingTasks.reduce((max, t) => Math.max(max, t.order), -1);
      const now = new Date();
      
      const id = await db.tasks.add({
        ...task,
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now
      });
      
      const newTask = await db.tasks.get(id);
      if (newTask) {
        update(tasks => [...tasks, newTask]);
      }
      return id;
    },
    async update(id: number, updates: Partial<Task>) {
      await db.tasks.update(id, {
        ...updates,
        updatedAt: new Date()
      });
      const updated = await db.tasks.get(id);
      if (updated) {
        update(tasks => tasks.map(t => t.id === id ? updated : t));
      }
    },
    async updateOrder(taskIds: number[]) {
      const updates = taskIds.map((id, index) => ({
        key: id,
        changes: { order: index }
      }));
      await db.tasks.bulkUpdate(updates);
      update(tasks => {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        return taskIds.map((id, index) => ({
          ...taskMap.get(id)!,
          order: index
        }));
      });
    },
    async delete(id: number) {
      await db.tasks.delete(id);
      update(tasks => tasks.filter(t => t.id !== id));
    },
    async toggleStatus(id: number) {
      const task = await db.tasks.get(id);
      if (task) {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        const completedAt = newStatus === 'completed' ? new Date() : undefined;
        await this.update(id, { status: newStatus, completedAt });
      }
    }
  };
}

export const tasks = createTasksStore();