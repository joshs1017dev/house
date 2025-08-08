import { writable, derived } from 'svelte/store';
import type { Project, Task, Material, Expense, Room, Contractor, Tool, Maintenance } from '../db/database';
import { db } from '../db/database';

// Projects store
function createProjectsStore() {
  const { subscribe, set, update } = writable<Project[]>([]);

  return {
    subscribe,
    async load() {
      const projects = await db.projects.toArray();
      set(projects);
    },
    async add(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
      const now = new Date();
      const id = await db.projects.add({
        ...project,
        actualCost: 0,
        tags: project.tags || [],
        createdAt: now,
        updatedAt: now
      });
      await this.load();
      return id;
    },
    async update(id: number, updates: Partial<Project>) {
      await db.projects.update(id, {
        ...updates,
        updatedAt: new Date()
      });
      await this.load();
    },
    async delete(id: number) {
      // Delete all related data
      await db.tasks.where('projectId').equals(id).delete();
      await db.materials.where('projectId').equals(id).delete();
      await db.expenses.where('projectId').equals(id).delete();
      await db.projects.delete(id);
      await this.load();
    }
  };
}

// Tasks store
function createTasksStore() {
  const { subscribe, set, update } = writable<Task[]>([]);

  return {
    subscribe,
    async load(projectId?: number) {
      const tasks = projectId 
        ? await db.tasks.where('projectId').equals(projectId).sortBy('order')
        : await db.tasks.toArray();
      set(tasks);
    },
    async add(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
      const now = new Date();
      const maxOrder = await db.tasks
        .where('projectId')
        .equals(task.projectId)
        .toArray()
        .then(tasks => Math.max(0, ...tasks.map(t => t.order || 0)));
      
      const id = await db.tasks.add({
        ...task,
        order: task.order ?? maxOrder + 1,
        createdAt: now,
        updatedAt: now
      });
      return id;
    },
    async update(id: number, updates: Partial<Task>) {
      await db.tasks.update(id, {
        ...updates,
        updatedAt: new Date()
      });
    },
    async delete(id: number) {
      await db.tasks.delete(id);
    },
    async reorder(tasks: { id: number, order: number }[]) {
      await db.transaction('rw', db.tasks, async () => {
        for (const task of tasks) {
          await db.tasks.update(task.id, { order: task.order });
        }
      });
    }
  };
}

// Materials store
function createMaterialsStore() {
  const { subscribe, set, update } = writable<Material[]>([]);

  return {
    subscribe,
    async load(projectId?: number) {
      const materials = projectId
        ? await db.materials.where('projectId').equals(projectId).toArray()
        : await db.materials.toArray();
      set(materials);
    },
    async add(material: Omit<Material, 'id'>) {
      const id = await db.materials.add(material);
      return id;
    },
    async update(id: number, updates: Partial<Material>) {
      await db.materials.update(id, updates);
    },
    async delete(id: number) {
      await db.materials.delete(id);
    }
  };
}

// Expenses store
function createExpensesStore() {
  const { subscribe, set, update } = writable<Expense[]>([]);

  return {
    subscribe,
    async load(projectId?: number) {
      const expenses = projectId
        ? await db.expenses.where('projectId').equals(projectId).toArray()
        : await db.expenses.toArray();
      set(expenses);
    },
    async add(expense: Omit<Expense, 'id'>) {
      const id = await db.expenses.add(expense);
      // Update project actual cost
      if (expense.projectId) {
        const project = await db.projects.get(expense.projectId);
        if (project) {
          const allExpenses = await db.expenses.where('projectId').equals(expense.projectId).toArray();
          const totalCost = allExpenses.reduce((sum, e) => sum + e.amount, 0);
          await db.projects.update(expense.projectId, { actualCost: totalCost });
        }
      }
      return id;
    },
    async update(id: number, updates: Partial<Expense>) {
      await db.expenses.update(id, updates);
    },
    async delete(id: number) {
      await db.expenses.delete(id);
    }
  };
}

// Rooms store
function createRoomsStore() {
  const { subscribe, set } = writable<Room[]>([]);

  return {
    subscribe,
    async load() {
      const rooms = await db.rooms.toArray();
      set(rooms);
    },
    async add(room: Omit<Room, 'id'>) {
      const id = await db.rooms.add(room);
      await this.load();
      return id;
    }
  };
}

// Create store instances
export const projects = createProjectsStore();
export const tasks = createTasksStore();
export const materials = createMaterialsStore();
export const expenses = createExpensesStore();
export const rooms = createRoomsStore();

// Derived stores
export const activeProjects = derived(projects, $projects => 
  $projects.filter(p => p.status === 'active')
);

export const projectStats = derived([projects, expenses], ([$projects, $expenses]) => {
  const totalBudget = $projects.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = $projects.reduce((sum, p) => sum + p.actualCost, 0);
  const activeCount = $projects.filter(p => p.status === 'active').length;
  const completedCount = $projects.filter(p => p.status === 'completed').length;
  
  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    activeCount,
    completedCount,
    totalCount: $projects.length
  };
});