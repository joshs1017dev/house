import { writable, derived } from 'svelte/store';
import { db, type Project } from '../db/database';

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
        createdAt: now,
        updatedAt: now
      });
      const newProject = await db.projects.get(id);
      if (newProject) {
        update(projects => [...projects, newProject]);
      }
      return id;
    },
    async update(id: number, updates: Partial<Project>) {
      await db.projects.update(id, {
        ...updates,
        updatedAt: new Date()
      });
      const updated = await db.projects.get(id);
      if (updated) {
        update(projects => projects.map(p => p.id === id ? updated : p));
      }
    },
    async delete(id: number) {
      await db.projects.delete(id);
      await db.tasks.where('projectId').equals(id).delete();
      await db.materials.where('projectId').equals(id).delete();
      await db.expenses.where('projectId').equals(id).delete();
      update(projects => projects.filter(p => p.id !== id));
    }
  };
}

export const projects = createProjectsStore();

export const activeProjects = derived(
  projects,
  $projects => $projects.filter(p => p.status === 'active')
);

export const projectsByRoom = derived(
  projects,
  $projects => {
    const grouped = new Map<number | undefined, Project[]>();
    $projects.forEach(project => {
      const roomId = project.roomId;
      if (!grouped.has(roomId)) {
        grouped.set(roomId, []);
      }
      grouped.get(roomId)!.push(project);
    });
    return grouped;
  }
);