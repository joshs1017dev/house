import Dexie, { type Table } from 'dexie';

export interface Project {
  id?: number;
  // Basic Information
  name: string;
  projectNumber?: string;
  description: string;
  type?: string;
  deliveryMethod?: string;
  
  // Location
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  
  // Contract Information
  contractDate?: Date;
  startDate: Date;
  targetEndDate?: Date;
  actualEndDate?: Date;
  finalCompletion?: Date;
  
  // Financial
  budget: number;
  actualCost: number;
  contingency?: number;
  retainage?: number;
  
  // Key Stakeholders
  owner?: string;
  architect?: string;
  generalContractor?: string;
  projectManager?: string;
  superintendent?: string;
  
  // Project Details
  squareFootage?: number;
  numberOfFloors?: number;
  constructionType?: string;
  
  // Status and Management
  status: 'planning' | 'active' | 'paused' | 'completed';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  category?: string;
  
  // Performance Metrics
  phases?: number;
  milestones?: number;
  completionPercentage: number;
  criticalPathLength?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  safetyRating?: number;
  qualityScore?: number;
  
  // Legacy fields for compatibility
  roomId?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPhase {
  id?: number;
  projectId: number;
  name: string;
  description?: string;
  order: number;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'active' | 'completed';
  percentComplete: number;
}

export interface Task {
  id?: number;
  projectId: number;
  phaseId?: number;
  parentTaskId?: number;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  startDate?: Date;
  dueDate?: Date;
  completedAt?: Date;
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  percentComplete: number;
  dependencies?: number[];
  predecessors?: number[];
  successors?: number[];
  criticalPath?: boolean;
  milestone?: boolean;
  deliverables?: string[];
  risks?: string[];
  order: number;
  depth: number;
  createdAt: Date;
  updatedAt: Date;
  // For critical path calculation
  earlyStart?: number;
  earlyFinish?: number;
  lateStart?: number;
  lateFinish?: number;
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
  isBefore?: boolean;
  isAfter?: boolean;
  timestamp: Date;
  tags?: string[];
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

export interface MaintenanceReminder {
  id?: number;
  title: string;
  description?: string;
  category: string;
  frequency: string;
  customDays?: number;
  lastCompleted: Date;
  nextDue: Date;
  cost?: number;
  notes?: string;
  isActive: boolean;
}

export interface MaintenanceHistory {
  id?: number;
  reminderId: number;
  completedDate: Date;
  cost?: number;
  notes?: string;
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

export interface Resource {
  id?: number;
  name: string;
  type: 'person' | 'equipment' | 'material';
  availability: number; // hours per day
  cost?: number; // per hour
  skills?: string[];
}

export interface TaskResource {
  id?: number;
  taskId: number;
  resourceId: number;
  hours: number;
  startDate: Date;
  endDate: Date;
}

export interface ProjectRisk {
  id?: number;
  projectId: number;
  title: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
  status: 'identified' | 'mitigating' | 'resolved';
  createdAt: Date;
}

export interface ProjectUpdate {
  id?: number;
  projectId: number;
  phaseId?: number;
  taskId?: number;
  type: 'progress' | 'issue' | 'milestone' | 'change';
  title: string;
  description: string;
  impact?: string;
  attachments?: string[];
  createdAt: Date;
  createdBy?: string;
}

class HomeDatabase extends Dexie {
  projects!: Table<Project>;
  projectPhases!: Table<ProjectPhase>;
  tasks!: Table<Task>;
  materials!: Table<Material>;
  photos!: Table<Photo>;
  expenses!: Table<Expense>;
  contractors!: Table<Contractor>;
  rooms!: Table<Room>;
  tools!: Table<Tool>;
  maintenanceReminders!: Table<MaintenanceReminder>;
  maintenanceHistory!: Table<MaintenanceHistory>;
  templates!: Table<Template>;
  resources!: Table<Resource>;
  taskResources!: Table<TaskResource>;
  projectRisks!: Table<ProjectRisk>;
  projectUpdates!: Table<ProjectUpdate>;

  constructor() {
    super('HomeDatabase');
    
    this.version(2).stores({
      projects: '++id, name, roomId, status, priority, createdAt',
      projectPhases: '++id, projectId, order',
      tasks: '++id, projectId, phaseId, parentTaskId, status, priority, dueDate, order',
      resources: '++id, name, type',
      taskResources: '++id, taskId, resourceId',
      projectRisks: '++id, projectId, status',
      projectUpdates: '++id, projectId, phaseId, taskId, createdAt',
      materials: '++id, projectId, status',
      photos: '++id, projectId, taskId, timestamp',
      expenses: '++id, projectId, category, date',
      contractors: '++id, name, specialty',
      rooms: '++id, name, type',
      tools: '++id, name, category, owned',
      maintenanceReminders: '++id, category, nextDue',
      maintenanceHistory: '++id, reminderId, completedDate',
      templates: '++id, name, category'
    });
  }
}

export const db = new HomeDatabase();