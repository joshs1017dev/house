<script lang="ts">
  import { onMount } from 'svelte';
  import { projects, tasks } from '../stores';
  import { db } from '../db/database';
  import type { Project, Task, Resource, TaskResource } from '../db/database';
  import { SchedulingEngine, extractDependencies, monteCarloSimulation, type ScheduledTask } from '../utils/scheduling';
  
  let selectedProject: Project | null = null;
  let allProjects: Project[] = [];
  let projectTasks: Task[] = [];
  let scheduledTasks: ScheduledTask[] = [];
  let resources: Resource[] = [];
  let taskResources: TaskResource[] = [];
  let projectStats: any = null;
  let monteCarloResults: any = null;
  let viewMode: 'network' | 'gantt' | 'resource' | 'analysis' = 'network';
  let showCriticalOnly = false;
  let isCalculating = false;
  
  onMount(async () => {
    await loadProjects();
  });
  
  async function loadProjects() {
    await projects.load();
    allProjects = await db.projects.toArray();
    if (allProjects.length > 0 && !selectedProject) {
      selectedProject = allProjects[0];
      await loadProjectData();
    }
  }
  
  async function loadProjectData() {
    if (!selectedProject) return;
    
    projectTasks = await db.tasks
      .where('projectId')
      .equals(selectedProject.id!)
      .toArray();
      
    resources = await db.resources.toArray();
    taskResources = await db.taskResources.toArray();
    
    calculateSchedule();
  }
  
  async function calculateSchedule() {
    if (!selectedProject || projectTasks.length === 0) return;
    
    isCalculating = true;
    
    try {
      const dependencies = extractDependencies(projectTasks);
      const engine = new SchedulingEngine(projectTasks, dependencies, selectedProject.startDate);
      
      scheduledTasks = engine.schedule();
      
      // Apply resource leveling if resources exist
      if (resources.length > 0) {
        scheduledTasks = engine.levelResources(scheduledTasks, resources, taskResources);
      }
      
      projectStats = engine.getProjectStatistics(scheduledTasks);
      
      // Run Monte Carlo simulation
      monteCarloResults = monteCarloSimulation(projectTasks, dependencies, selectedProject.startDate, 500);
      
      // Update project with calculated values
      await projects.update(selectedProject.id!, {
        criticalPathLength: projectStats.criticalPathLength,
        targetEndDate: projectStats.projectEndDate
      });
      
      // Update tasks with calculated values
      for (const task of scheduledTasks) {
        await db.tasks.update(task.id!, {
          earlyStart: task.earlyStart,
          earlyFinish: task.earlyFinish,
          lateStart: task.lateStart,
          lateFinish: task.lateFinish,
          criticalPath: task.isCritical,
          startDate: task.startDate,
          dueDate: task.dueDate
        });
      }
    } catch (error) {
      console.error('Error calculating schedule:', error);
    } finally {
      isCalculating = false;
    }
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
  
  function formatFloat(value: number): string {
    return value.toFixed(1);
  }
  
  function getFloatColor(float: number): string {
    if (float === 0) return '#ef4444'; // Critical
    if (float < 5) return '#f59e0b'; // Near critical
    return '#10b981'; // Safe
  }
  
  function getResourceUtilization(resourceId: number, day: number): number {
    const dayTasks = scheduledTasks.filter(task => 
      task.earlyStart <= day && task.earlyFinish > day
    );
    
    let totalHours = 0;
    dayTasks.forEach(task => {
      const tr = taskResources.find(tr => tr.taskId === task.id && tr.resourceId === resourceId);
      if (tr) {
        totalHours += tr.hours / task.duration;
      }
    });
    
    const resource = resources.find(r => r.id === resourceId);
    return resource ? (totalHours / (resource.availability * 8)) * 100 : 0;
  }
  
  $: filteredTasks = showCriticalOnly ? 
    scheduledTasks.filter(t => t.isCritical) : 
    scheduledTasks;
</script>

<div class="scheduling-view">
  <div class="scheduling-header">
    <h2>Advanced Scheduling</h2>
    <div class="header-actions">
      <select bind:value={selectedProject} on:change={loadProjectData}>
        {#each allProjects as project}
          <option value={project}>{project.name}</option>
        {/each}
      </select>
      
      <button 
        class="btn-primary" 
        on:click={calculateSchedule}
        disabled={isCalculating}
      >
        {isCalculating ? '⏳ Calculating...' : '🔄 Recalculate Schedule'}
      </button>
    </div>
  </div>
  
  {#if projectStats}
    <div class="schedule-summary">
      <div class="summary-card">
        <h4>Duration</h4>
        <p class="value">{projectStats.projectDuration} days</p>
        <p class="label">Working Days</p>
      </div>
      
      <div class="summary-card">
        <h4>End Date</h4>
        <p class="value">{formatDate(projectStats.projectEndDate)}</p>
        <p class="label">Projected Completion</p>
      </div>
      
      <div class="summary-card">
        <h4>Critical Path</h4>
        <p class="value">{projectStats.criticalTaskCount} / {projectStats.totalTaskCount}</p>
        <p class="label">Critical Tasks</p>
      </div>
      
      <div class="summary-card">
        <h4>Schedule Risk</h4>
        <p class="value">{formatFloat(projectStats.averageFloat)} days</p>
        <p class="label">Average Float</p>
      </div>
    </div>
  {/if}
  
  <div class="view-tabs">
    <button 
      class:active={viewMode === 'network'}
      on:click={() => viewMode = 'network'}
    >
      🕸️ Network Diagram
    </button>
    <button 
      class:active={viewMode === 'gantt'}
      on:click={() => viewMode = 'gantt'}
    >
      📊 Gantt Chart
    </button>
    <button 
      class:active={viewMode === 'resource'}
      on:click={() => viewMode = 'resource'}
    >
      👥 Resource View
    </button>
    <button 
      class:active={viewMode === 'analysis'}
      on:click={() => viewMode = 'analysis'}
    >
      📈 Risk Analysis
    </button>
  </div>
  
  <div class="view-controls">
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={showCriticalOnly} />
      Show Critical Path Only
    </label>
  </div>
  
  <div class="schedule-content">
    {#if viewMode === 'network'}
      <div class="network-view">
        <h3>Network Diagram (PERT/CPM)</h3>
        <div class="network-diagram">
          {#each filteredTasks as task}
            <div 
              class="network-node"
              class:critical={task.isCritical}
              style="
                left: {(task.earlyStart / projectStats.projectDuration) * 90}%;
                top: {task.level * 120}px;
              "
            >
              <div class="node-header">
                <span class="node-id">ID: {task.id}</span>
                <span class="node-duration">{task.duration}d</span>
              </div>
              <div class="node-title">{task.title}</div>
              <div class="node-times">
                <div class="time-row">
                  <span>ES: {task.earlyStart}</span>
                  <span>EF: {task.earlyFinish}</span>
                </div>
                <div class="time-row">
                  <span>LS: {task.lateStart}</span>
                  <span>LF: {task.lateFinish}</span>
                </div>
              </div>
              <div class="node-float" style="color: {getFloatColor(task.totalFloat)}">
                TF: {formatFloat(task.totalFloat)}d | FF: {formatFloat(task.freeFloat)}d
              </div>
            </div>
          {/each}
          
          <!-- Draw dependency lines -->
          <svg class="dependency-lines">
            {#each projectTasks as task}
              {#if task.dependencies}
                {#each task.dependencies as depId}
                  {@const fromTask = scheduledTasks.find(t => t.id === depId)}
                  {@const toTask = scheduledTasks.find(t => t.id === task.id)}
                  {#if fromTask && toTask}
                    <line
                      x1="{(fromTask.earlyStart / projectStats.projectDuration) * 90 + 10}%"
                      y1="{fromTask.level * 120 + 60}"
                      x2="{(toTask.earlyStart / projectStats.projectDuration) * 90}%"
                      y2="{toTask.level * 120 + 30}"
                      stroke={fromTask.isCritical && toTask.isCritical ? '#ef4444' : '#6b7280'}
                      stroke-width="2"
                      marker-end="url(#arrowhead)"
                    />
                  {/if}
                {/each}
              {/if}
            {/each}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>
      
    {:else if viewMode === 'gantt'}
      <div class="gantt-view">
        <h3>Gantt Chart with Dependencies</h3>
        <div class="gantt-container">
          <div class="gantt-tasks">
            {#each filteredTasks as task}
              <div class="gantt-task-row">
                <div class="task-info">
                  <span class="task-name" class:critical={task.isCritical}>
                    {task.title}
                  </span>
                  <span class="task-dates">
                    {formatDate(task.startDate)} - {formatDate(task.dueDate)}
                  </span>
                </div>
                <div class="task-bar-container">
                  <div 
                    class="task-bar"
                    class:critical={task.isCritical}
                    style="
                      left: {(task.earlyStart / projectStats.projectDuration) * 100}%;
                      width: {(task.duration / projectStats.projectDuration) * 100}%;
                    "
                  >
                    <div class="task-progress" style="width: {task.percentComplete}%"></div>
                    <span class="task-float">Float: {formatFloat(task.totalFloat)}d</span>
                  </div>
                  {#if task.totalFloat > 0}
                    <div 
                      class="float-bar"
                      style="
                        left: {(task.earlyFinish / projectStats.projectDuration) * 100}%;
                        width: {(task.totalFloat / projectStats.projectDuration) * 100}%;
                      "
                    ></div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
      
    {:else if viewMode === 'resource'}
      <div class="resource-view">
        <h3>Resource Utilization Chart</h3>
        {#if resources.length > 0}
          <div class="resource-chart">
            {#each resources as resource}
              <div class="resource-row">
                <h4>{resource.name}</h4>
                <div class="utilization-chart">
                  {#each Array(projectStats.projectDuration) as _, day}
                    {#if true}
                      {@const utilization = getResourceUtilization(resource.id || 0, day)}
                      <div 
                        class="utilization-bar"
                        style="
                          height: {utilization}%;
                          background: {utilization > 100 ? '#ef4444' : utilization > 80 ? '#f59e0b' : '#10b981'};
                        "
                        title="Day {day + 1}: {utilization.toFixed(0)}% utilized"
                      ></div>
                    {/if}
                  {/each}
                </div>
                <div class="utilization-scale">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-state">No resources assigned to tasks</p>
        {/if}
      </div>
      
    {:else if viewMode === 'analysis'}
      <div class="analysis-view">
        <h3>Schedule Risk Analysis</h3>
        {#if monteCarloResults}
          <div class="monte-carlo-results">
            <h4>Monte Carlo Simulation Results (500 iterations)</h4>
            <div class="simulation-stats">
              <div class="stat">
                <span class="label">10% Probability:</span>
                <span class="value">{monteCarloResults.p10.toFixed(1)} days</span>
                <span class="date">({formatDate(new Date(selectedProject.startDate.getTime() + monteCarloResults.p10 * 24 * 60 * 60 * 1000))})</span>
              </div>
              <div class="stat">
                <span class="label">50% Probability:</span>
                <span class="value">{monteCarloResults.p50.toFixed(1)} days</span>
                <span class="date">({formatDate(new Date(selectedProject.startDate.getTime() + monteCarloResults.p50 * 24 * 60 * 60 * 1000))})</span>
              </div>
              <div class="stat">
                <span class="label">90% Probability:</span>
                <span class="value">{monteCarloResults.p90.toFixed(1)} days</span>
                <span class="date">({formatDate(new Date(selectedProject.startDate.getTime() + monteCarloResults.p90 * 24 * 60 * 60 * 1000))})</span>
              </div>
              <div class="stat">
                <span class="label">Mean Duration:</span>
                <span class="value">{monteCarloResults.mean.toFixed(1)} days</span>
              </div>
              <div class="stat">
                <span class="label">Standard Deviation:</span>
                <span class="value">{monteCarloResults.stdDev.toFixed(1)} days</span>
              </div>
            </div>
          </div>
          
          <div class="critical-tasks-analysis">
            <h4>Critical Tasks Analysis</h4>
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Duration</th>
                  <th>Total Float</th>
                  <th>Free Float</th>
                  <th>Criticality</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {#each scheduledTasks.filter(t => t.isCritical || t.totalFloat < 5) as task}
                  <tr class:critical={task.isCritical}>
                    <td>{task.title}</td>
                    <td>{task.duration} days</td>
                    <td style="color: {getFloatColor(task.totalFloat)}">{formatFloat(task.totalFloat)}</td>
                    <td>{formatFloat(task.freeFloat)}</td>
                    <td>{task.isCritical ? '🔴 Critical' : '🟡 Near Critical'}</td>
                    <td>{task.totalFloat === 0 ? 'High' : task.totalFloat < 5 ? 'Medium' : 'Low'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .scheduling-view {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .scheduling-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .header-actions select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
  }
  
  .schedule-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .summary-card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  
  .summary-card h4 {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .summary-card .value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }
  
  .summary-card .label {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }
  
  .view-tabs {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }
  
  .view-tabs button {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-weight: 500;
    color: #6b7280;
    transition: all 0.2s;
  }
  
  .view-tabs button:hover {
    color: #1f2937;
  }
  
  .view-tabs button.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }
  
  .view-controls {
    margin-bottom: 1rem;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .schedule-content {
    flex: 1;
    background: white;
    border-radius: 0.5rem;
    padding: 2rem;
    overflow: auto;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  /* Network Diagram Styles */
  .network-view h3 {
    margin-bottom: 1.5rem;
  }
  
  .network-diagram {
    position: relative;
    min-height: 600px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 2rem;
    overflow: auto;
  }
  
  .network-node {
    position: absolute;
    width: 200px;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .network-node:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .network-node.critical {
    border-color: #ef4444;
    background: #fef2f2;
  }
  
  .node-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }
  
  .node-title {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #1f2937;
  }
  
  .node-times {
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .time-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }
  
  .node-float {
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
  }
  
  .dependency-lines {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  
  /* Gantt Chart Styles */
  .gantt-container {
    overflow-x: auto;
  }
  
  .gantt-task-row {
    display: flex;
    align-items: center;
    border-bottom: 1px solid #f3f4f6;
    padding: 0.75rem 0;
  }
  
  .task-info {
    width: 300px;
    min-width: 300px;
    padding-right: 1rem;
  }
  
  .task-name {
    display: block;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .task-name.critical {
    color: #ef4444;
  }
  
  .task-dates {
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  .task-bar-container {
    flex: 1;
    position: relative;
    height: 30px;
    background: #f3f4f6;
    border-radius: 0.25rem;
  }
  
  .task-bar {
    position: absolute;
    height: 100%;
    background: #3b82f6;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    padding: 0 0.5rem;
    color: white;
    font-size: 0.75rem;
    overflow: hidden;
  }
  
  .task-bar.critical {
    background: #ef4444;
  }
  
  .task-progress {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: rgba(0, 0, 0, 0.2);
  }
  
  .task-float {
    position: relative;
    z-index: 1;
    white-space: nowrap;
  }
  
  .float-bar {
    position: absolute;
    height: 100%;
    background: #fbbf24;
    opacity: 0.3;
    border-radius: 0.25rem;
  }
  
  /* Resource View Styles */
  .resource-row {
    margin-bottom: 2rem;
  }
  
  .resource-row h4 {
    margin-bottom: 1rem;
  }
  
  .utilization-chart {
    display: flex;
    height: 100px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    align-items: flex-end;
    padding: 0.25rem;
    gap: 1px;
  }
  
  .utilization-bar {
    flex: 1;
    min-height: 2px;
    border-radius: 0.125rem;
    transition: height 0.2s;
  }
  
  .utilization-scale {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  /* Analysis View Styles */
  .analysis-view h3,
  .analysis-view h4 {
    margin-bottom: 1rem;
  }
  
  .monte-carlo-results {
    background: #f9fafb;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
  }
  
  .simulation-stats {
    display: grid;
    gap: 1rem;
  }
  
  .stat {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .stat .label {
    font-weight: 500;
    min-width: 150px;
  }
  
  .stat .value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
  }
  
  .stat .date {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .critical-tasks-analysis table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .critical-tasks-analysis th {
    background: #f9fafb;
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #e5e7eb;
  }
  
  .critical-tasks-analysis td {
    padding: 0.75rem;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .critical-tasks-analysis tr.critical {
    background: #fef2f2;
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }
  
  .btn-primary {
    background: #3b82f6;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .btn-primary:hover {
    background: #2563eb;
  }
  
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    .scheduling-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    
    .schedule-summary {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    
    .view-tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .view-tabs button {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      white-space: nowrap;
    }
    
    .task-info {
      width: 150px;
      min-width: 150px;
    }
    
    .network-node {
      width: 150px;
      font-size: 0.813rem;
      padding: 0.75rem;
    }
    
    .network-diagram {
      min-height: 400px;
    }
    
    .gantt-container {
      font-size: 0.813rem;
    }
    
    .simulation-stats {
      font-size: 0.875rem;
    }
    
    table {
      font-size: 0.813rem;
    }
    
    th, td {
      padding: 0.5rem;
    }
  }
  
  @media (max-width: 480px) {
    .schedule-summary {
      grid-template-columns: 1fr;
    }
    
    .summary-card {
      padding: 1rem;
    }
    
    .summary-card h4 {
      font-size: 0.75rem;
    }
    
    .summary-card .value {
      font-size: 1.25rem;
    }
    
    .view-tabs {
      gap: 0.5rem;
    }
    
    .view-tabs button {
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
    }
    
    .network-node {
      width: 120px;
      padding: 0.5rem;
    }
    
    .node-header,
    .node-times,
    .node-float {
      font-size: 0.688rem;
    }
    
    .task-info {
      width: 120px;
      min-width: 120px;
      padding: 0.5rem;
    }
    
    .task-name {
      font-size: 0.813rem;
    }
    
    .task-dates {
      font-size: 0.688rem;
    }
  }
</style>