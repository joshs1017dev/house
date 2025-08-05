import Dexie, { type Table } from 'dexie';

export interface Project {
  id?: number;
  name: string;
  description: string;
  roomId?: number;
  startDate: Date;
  targetEndDate?: Date;
  actualEndDate?: Date;
  status: 'planning' | 'active' | 'paused' | 'completed';
  priority: 'low' | 'medium' | 'high';
  budget: number;
  actualCost: number;
  tags: string[];
  coverPhoto?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id?: number;
  projectId: number;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  completedAt?: Date;
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies?: number[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id?: number;
  projectId: number;
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  actualCost?: number;
  vendor?: string;
  purchaseDate?: Date;
  status: 'needed' | 'ordered' | 'received';
  url?: string;
  notes?: string;
}

export interface Photo {
  id?: number;
  projectId: number;
  taskId?: number;
  url: string;
  thumbnail?: string;
  caption?: string;
  isBefore: boolean;
  timestamp: Date;
  tags: string[];
}

export interface Expense {
  id?: number;
  projectId: number;
  materialId?: number;
  category: 'materials' | 'labor' | 'permits' | 'tools' | 'other';
  amount: number;
  description: string;
  vendor?: string;
  receiptPhoto?: string;
  date: Date;
}

export interface Contractor {
  id?: number;
  name: string;
  company?: string;
  specialty: string;
  phone?: string;
  email?: string;
  rating?: number;
  notes?: string;
  projectIds: number[];
}

export interface Room {
  id?: number;
  name: string;
  type: 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'garage' | 'basement' | 'attic' | 'exterior' | 'other';
  squareFeet?: number;
  notes?: string;
}

export interface Tool {
  id?: number;
  name: string;
  category: string;
  owned: boolean;
  location?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  notes?: string;
}

export interface Maintenance {
  id?: number;
  title: string;
  description?: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  lastCompleted?: Date;
  nextDue: Date;
  roomId?: number;
  reminderDays?: number;
  cost?: number;
}

export interface Template {
  id?: number;
  name: string;
  category: string;
  description: string;
  tasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
  materials: Omit<Material, 'id' | 'projectId'>[];
  estimatedBudget: number;
  estimatedDuration: number;
}

class HomeDatabase extends Dexie {
  projects!: Table<Project>;
  tasks!: Table<Task>;
  materials!: Table<Material>;
  photos!: Table<Photo>;
  expenses!: Table<Expense>;
  contractors!: Table<Contractor>;
  rooms!: Table<Room>;
  tools!: Table<Tool>;
  maintenance!: Table<Maintenance>;
  templates!: Table<Template>;

  constructor() {
    super('HomeDatabase');
    
    this.version(1).stores({
      projects: '++id, name, roomId, status, priority, createdAt',
      tasks: '++id, projectId, status, priority, dueDate, order',
      materials: '++id, projectId, status',
      photos: '++id, projectId, taskId, timestamp',
      expenses: '++id, projectId, category, date',
      contractors: '++id, name, specialty',
      rooms: '++id, name, type',
      tools: '++id, name, category, owned',
      maintenance: '++id, nextDue, roomId',
      templates: '++id, name, category'
    });
  }
}

export const db = new HomeDatabase();