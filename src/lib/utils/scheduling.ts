import type { Task, Project, Resource, TaskResource } from '../db/database';

// Task dependency types
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'; // Finish-to-Start, Start-to-Start, etc.

export interface TaskDependency {
  predecessorId: number;
  successorId: number;
  type: DependencyType;
  lag: number; // in days, can be negative
}

export interface ScheduledTask extends Task {
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
  duration: number; // in days
  level: number; // for Gantt chart positioning
}

export interface NetworkNode {
  task: Task;
  predecessors: NetworkNode[];
  successors: NetworkNode[];
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  duration: number;
}

export class SchedulingEngine {
  private tasks: Map<number, Task>;
  private dependencies: TaskDependency[];
  private workingDaysPerWeek: number = 5;
  private hoursPerDay: number = 8;
  private projectStartDate: Date;
  
  constructor(tasks: Task[], dependencies: TaskDependency[], projectStartDate: Date) {
    this.tasks = new Map(tasks.map(t => [t.id!, t]));
    this.dependencies = dependencies;
    this.projectStartDate = projectStartDate;
  }
  
  // Convert hours to working days
  private hoursToDays(hours: number): number {
    return Math.ceil(hours / this.hoursPerDay);
  }
  
  // Calculate working days between two dates
  private getWorkingDaysBetween(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }
  
  // Add working days to a date
  private addWorkingDays(date: Date, days: number): Date {
    const result = new Date(date);
    let daysAdded = 0;
    
    while (daysAdded < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }
    
    return result;
  }
  
  // Build network diagram
  private buildNetwork(): Map<number, NetworkNode> {
    const network = new Map<number, NetworkNode>();
    
    // Create nodes
    this.tasks.forEach((task, id) => {
      network.set(id, {
        task,
        predecessors: [],
        successors: [],
        earlyStart: 0,
        earlyFinish: 0,
        lateStart: Infinity,
        lateFinish: Infinity,
        duration: this.hoursToDays(task.estimatedHours || 0)
      });
    });
    
    // Connect nodes based on dependencies
    this.dependencies.forEach(dep => {
      const pred = network.get(dep.predecessorId);
      const succ = network.get(dep.successorId);
      
      if (pred && succ) {
        pred.successors.push(succ);
        succ.predecessors.push(pred);
      }
    });
    
    return network;
  }
  
  // Forward pass - calculate early start and finish times
  private forwardPass(network: Map<number, NetworkNode>): void {
    const visited = new Set<number>();
    const queue: NetworkNode[] = [];
    
    // Find nodes with no predecessors (start nodes)
    network.forEach((node, id) => {
      if (node.predecessors.length === 0) {
        node.earlyStart = 0;
        node.earlyFinish = node.duration;
        queue.push(node);
      }
    });
    
    // Process nodes in topological order
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentId = current.task.id!;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      // Calculate early times for successors
      current.successors.forEach(successor => {
        const dependency = this.dependencies.find(
          d => d.predecessorId === currentId && d.successorId === successor.task.id
        );
        
        let predecessorFinish = current.earlyFinish;
        
        // Apply dependency type and lag
        if (dependency) {
          switch (dependency.type) {
            case 'FS': // Finish-to-Start (default)
              successor.earlyStart = Math.max(
                successor.earlyStart, 
                predecessorFinish + dependency.lag
              );
              break;
            case 'SS': // Start-to-Start
              successor.earlyStart = Math.max(
                successor.earlyStart,
                current.earlyStart + dependency.lag
              );
              break;
            case 'FF': // Finish-to-Finish
              successor.earlyFinish = Math.max(
                successor.earlyFinish,
                predecessorFinish + dependency.lag
              );
              successor.earlyStart = successor.earlyFinish - successor.duration;
              break;
            case 'SF': // Start-to-Finish
              successor.earlyFinish = Math.max(
                successor.earlyFinish,
                current.earlyStart + dependency.lag
              );
              successor.earlyStart = successor.earlyFinish - successor.duration;
              break;
          }
        } else {
          // Default to FS with no lag
          successor.earlyStart = Math.max(successor.earlyStart, predecessorFinish);
        }
        
        successor.earlyFinish = successor.earlyStart + successor.duration;
        
        // Add to queue if all predecessors have been processed
        const allPredecessorsVisited = successor.predecessors.every(
          pred => visited.has(pred.task.id!)
        );
        if (allPredecessorsVisited && !visited.has(successor.task.id!)) {
          queue.push(successor);
        }
      });
    }
  }
  
  // Backward pass - calculate late start and finish times
  private backwardPass(network: Map<number, NetworkNode>, projectFinish: number): void {
    const visited = new Set<number>();
    const queue: NetworkNode[] = [];
    
    // Find nodes with no successors (end nodes)
    network.forEach((node, id) => {
      if (node.successors.length === 0) {
        node.lateFinish = projectFinish;
        node.lateStart = node.lateFinish - node.duration;
        queue.push(node);
      }
    });
    
    // Process nodes in reverse topological order
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentId = current.task.id!;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      // Calculate late times for predecessors
      current.predecessors.forEach(predecessor => {
        const dependency = this.dependencies.find(
          d => d.predecessorId === predecessor.task.id && d.successorId === currentId
        );
        
        let successorStart = current.lateStart;
        
        // Apply dependency type and lag
        if (dependency) {
          switch (dependency.type) {
            case 'FS': // Finish-to-Start
              predecessor.lateFinish = Math.min(
                predecessor.lateFinish,
                successorStart - dependency.lag
              );
              break;
            case 'SS': // Start-to-Start
              predecessor.lateStart = Math.min(
                predecessor.lateStart,
                successorStart - dependency.lag
              );
              predecessor.lateFinish = predecessor.lateStart + predecessor.duration;
              break;
            case 'FF': // Finish-to-Finish
              predecessor.lateFinish = Math.min(
                predecessor.lateFinish,
                current.lateFinish - dependency.lag
              );
              break;
            case 'SF': // Start-to-Finish
              predecessor.lateStart = Math.min(
                predecessor.lateStart,
                current.lateFinish - dependency.lag
              );
              predecessor.lateFinish = predecessor.lateStart + predecessor.duration;
              break;
          }
        } else {
          // Default to FS with no lag
          predecessor.lateFinish = Math.min(predecessor.lateFinish, successorStart);
        }
        
        predecessor.lateStart = predecessor.lateFinish - predecessor.duration;
        
        // Add to queue if all successors have been processed
        const allSuccessorsVisited = predecessor.successors.every(
          succ => visited.has(succ.task.id!)
        );
        if (allSuccessorsVisited && !visited.has(predecessor.task.id!)) {
          queue.push(predecessor);
        }
      });
    }
  }
  
  // Calculate float times and identify critical path
  private calculateFloatAndCriticalPath(network: Map<number, NetworkNode>): void {
    network.forEach(node => {
      const totalFloat = node.lateStart - node.earlyStart;
      const isCritical = Math.abs(totalFloat) < 0.001; // Account for floating point precision
      
      // Update task with calculated values
      const task = node.task;
      task.earlyStart = node.earlyStart;
      task.earlyFinish = node.earlyFinish;
      task.lateStart = node.lateStart;
      task.lateFinish = node.lateFinish;
      task.criticalPath = isCritical;
    });
  }
  
  // Main scheduling method
  public schedule(): ScheduledTask[] {
    const network = this.buildNetwork();
    
    // Perform forward pass
    this.forwardPass(network);
    
    // Find project finish time
    let projectFinish = 0;
    network.forEach(node => {
      projectFinish = Math.max(projectFinish, node.earlyFinish);
    });
    
    // Perform backward pass
    this.backwardPass(network, projectFinish);
    
    // Calculate float and critical path
    this.calculateFloatAndCriticalPath(network);
    
    // Convert to scheduled tasks
    const scheduledTasks: ScheduledTask[] = [];
    network.forEach(node => {
      const task = node.task;
      const totalFloat = node.lateStart - node.earlyStart;
      const freeFloat = this.calculateFreeFloat(node, network);
      
      scheduledTasks.push({
        ...task,
        earlyStart: node.earlyStart,
        earlyFinish: node.earlyFinish,
        lateStart: node.lateStart,
        lateFinish: node.lateFinish,
        totalFloat,
        freeFloat,
        isCritical: task.criticalPath || false,
        duration: node.duration,
        level: this.calculateLevel(node, network)
      });
    });
    
    // Convert relative days to actual dates
    this.applyActualDates(scheduledTasks);
    
    return scheduledTasks;
  }
  
  // Calculate free float (float that doesn't affect successors)
  private calculateFreeFloat(node: NetworkNode, network: Map<number, NetworkNode>): number {
    if (node.successors.length === 0) {
      return node.lateFinish - node.earlyFinish;
    }
    
    let minSuccessorES = Infinity;
    node.successors.forEach(successor => {
      minSuccessorES = Math.min(minSuccessorES, successor.earlyStart);
    });
    
    return minSuccessorES - node.earlyFinish;
  }
  
  // Calculate level for Gantt chart display
  private calculateLevel(node: NetworkNode, network: Map<number, NetworkNode>): number {
    const visited = new Set<number>();
    const queue: { node: NetworkNode; level: number }[] = [];
    
    // Start from nodes with no predecessors
    if (node.predecessors.length === 0) {
      return 0;
    }
    
    // Find the maximum level of predecessors
    let maxLevel = 0;
    node.predecessors.forEach(pred => {
      const predLevel = this.calculateLevel(pred, network);
      maxLevel = Math.max(maxLevel, predLevel);
    });
    
    return maxLevel + 1;
  }
  
  // Convert relative days to actual calendar dates
  private applyActualDates(tasks: ScheduledTask[]): void {
    tasks.forEach(task => {
      task.startDate = this.addWorkingDays(this.projectStartDate, task.earlyStart);
      task.dueDate = this.addWorkingDays(this.projectStartDate, task.earlyFinish);
    });
  }
  
  // Resource leveling - smooth out resource usage
  public levelResources(
    scheduledTasks: ScheduledTask[], 
    resources: Resource[], 
    taskResources: TaskResource[]
  ): ScheduledTask[] {
    // Create resource availability map
    const resourceAvailability = new Map<number, number[]>();
    resources.forEach(resource => {
      resourceAvailability.set(resource.id!, []);
    });
    
    // Sort tasks by total float (critical tasks first)
    const sortedTasks = [...scheduledTasks].sort((a, b) => a.totalFloat - b.totalFloat);
    
    // Assign tasks to resources
    sortedTasks.forEach(task => {
      const taskResourceLinks = taskResources.filter(tr => tr.taskId === task.id);
      
      taskResourceLinks.forEach(tr => {
        const availability = resourceAvailability.get(tr.resourceId) || [];
        
        // Find earliest available slot
        let startDay = task.earlyStart;
        let canSchedule = false;
        
        while (startDay <= task.lateStart && !canSchedule) {
          canSchedule = true;
          
          // Check if resource is available for the duration
          for (let day = startDay; day < startDay + task.duration; day++) {
            const dailyUsage = availability[day] || 0;
            const resource = resources.find(r => r.id === tr.resourceId);
            
            if (resource && dailyUsage + tr.hours > resource.availability * this.hoursPerDay) {
              canSchedule = false;
              break;
            }
          }
          
          if (!canSchedule) {
            startDay++;
          }
        }
        
        // Update task schedule if needed
        if (startDay > task.earlyStart) {
          task.earlyStart = startDay;
          task.earlyFinish = startDay + task.duration;
          task.startDate = this.addWorkingDays(this.projectStartDate, startDay);
          task.dueDate = this.addWorkingDays(this.projectStartDate, task.earlyFinish);
        }
        
        // Update resource availability
        for (let day = task.earlyStart; day < task.earlyFinish; day++) {
          availability[day] = (availability[day] || 0) + tr.hours;
        }
        
        resourceAvailability.set(tr.resourceId, availability);
      });
    });
    
    return sortedTasks;
  }
  
  // Calculate project statistics
  public getProjectStatistics(scheduledTasks: ScheduledTask[]) {
    const criticalTasks = scheduledTasks.filter(t => t.isCritical);
    const projectDuration = Math.max(...scheduledTasks.map(t => t.earlyFinish));
    const projectEndDate = this.addWorkingDays(this.projectStartDate, projectDuration);
    
    return {
      projectDuration,
      projectEndDate,
      criticalTaskCount: criticalTasks.length,
      totalTaskCount: scheduledTasks.length,
      criticalPathLength: criticalTasks.reduce((sum, t) => sum + t.duration, 0),
      averageFloat: scheduledTasks.reduce((sum, t) => sum + t.totalFloat, 0) / scheduledTasks.length,
      tasksWithFloat: scheduledTasks.filter(t => t.totalFloat > 0).length
    };
  }
}

// Helper function to convert tasks to dependencies
export function extractDependencies(tasks: Task[]): TaskDependency[] {
  const dependencies: TaskDependency[] = [];
  
  tasks.forEach(task => {
    if (task.dependencies) {
      task.dependencies.forEach(depId => {
        dependencies.push({
          predecessorId: depId,
          successorId: task.id!,
          type: 'FS', // Default to Finish-to-Start
          lag: 0
        });
      });
    }
    
    if (task.predecessors) {
      task.predecessors.forEach(predId => {
        // Avoid duplicates
        if (!dependencies.some(d => d.predecessorId === predId && d.successorId === task.id)) {
          dependencies.push({
            predecessorId: predId,
            successorId: task.id!,
            type: 'FS',
            lag: 0
          });
        }
      });
    }
  });
  
  return dependencies;
}

// Monte Carlo simulation for schedule risk analysis
export function monteCarloSimulation(
  tasks: Task[], 
  dependencies: TaskDependency[],
  projectStartDate: Date,
  iterations: number = 1000
) {
  const results: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    // Create task variations with random durations (±20% variation)
    const variedTasks = tasks.map(task => ({
      ...task,
      estimatedHours: task.estimatedHours ? 
        task.estimatedHours * (0.8 + Math.random() * 0.4) : 0
    }));
    
    const engine = new SchedulingEngine(variedTasks, dependencies, projectStartDate);
    const scheduled = engine.schedule();
    const stats = engine.getProjectStatistics(scheduled);
    
    results.push(stats.projectDuration);
  }
  
  // Calculate percentiles
  results.sort((a, b) => a - b);
  
  return {
    p10: results[Math.floor(results.length * 0.1)],
    p50: results[Math.floor(results.length * 0.5)],
    p90: results[Math.floor(results.length * 0.9)],
    mean: results.reduce((sum, val) => sum + val, 0) / results.length,
    stdDev: Math.sqrt(
      results.reduce((sum, val) => sum + Math.pow(val - results.reduce((a, b) => a + b, 0) / results.length, 2), 0) / results.length
    )
  };
}