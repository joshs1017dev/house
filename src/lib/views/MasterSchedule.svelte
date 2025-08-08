<script lang="ts">
  import { onMount } from 'svelte';
  import { projects, tasks } from '../stores';
  import { db } from '../db/database';
  import type { Project, Task, ProjectPhase } from '../db/database';
  
  let allProjects: Project[] = [];
  let allTasks: Task[] = [];
  let allPhases: ProjectPhase[] = [];
  let viewMode: 'timeline' | 'calendar' | 'list' = 'timeline';
  let timeScale: 'day' | 'week' | 'month' | 'quarter' = 'week';
  let filterByProject = 'all';
  let filterByStatus = 'all';
  let showCriticalPathOnly = false;
  let showMilestonesOnly = false;
  
  // Timeline view settings
  let timelineStart: Date;
  let timelineEnd: Date;
  let timelineZoom = 1;
  
  onMount(async () => {
    await loadData();
  });
  
  async function loadData() {
    await projects.load();
    allProjects = await db.projects.toArray();
    allTasks = await db.tasks.toArray();
    allPhases = await db.projectPhases.toArray();
    calculateTimelineBounds();
  }
  
  function calculateTimelineBounds() {
    const dates: number[] = [];
    
    allProjects.forEach(p => {
      if (p.startDate) dates.push(p.startDate.getTime());
      if (p.targetEndDate) dates.push(p.targetEndDate.getTime());
    });
    
    allTasks.forEach(t => {
      if (t.startDate) dates.push(t.startDate.getTime());
      if (t.dueDate) dates.push(t.dueDate.getTime());
    });
    
    if (dates.length > 0) {
      timelineStart = new Date(Math.min(...dates));
      timelineEnd = new Date(Math.max(...dates));
      
      // Add padding
      timelineStart.setMonth(timelineStart.getMonth() - 1);
      timelineEnd.setMonth(timelineEnd.getMonth() + 1);
    } else {
      timelineStart = new Date();
      timelineEnd = new Date();
      timelineEnd.setFullYear(timelineEnd.getFullYear() + 1);
    }
  }
  
  function getFilteredTasks(): Task[] {
    let filtered = allTasks;
    
    if (filterByProject !== 'all') {
      filtered = filtered.filter(t => t.projectId === parseInt(filterByProject));
    }
    
    if (filterByStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterByStatus);
    }
    
    if (showCriticalPathOnly) {
      filtered = filtered.filter(t => t.criticalPath);
    }
    
    if (showMilestonesOnly) {
      filtered = filtered.filter(t => t.milestone);
    }
    
    return filtered;
  }
  
  function getProjectName(projectId: number): string {
    const project = allProjects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  }
  
  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  function getDaysFromStart(date: Date): number {
    return Math.floor((date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  function getPositionFromDate(date: Date): number {
    const totalDays = Math.floor((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysFromStart = getDaysFromStart(date);
    return (daysFromStart / totalDays) * 100;
  }
  
  function getTaskWidth(task: Task): number {
    if (!task.startDate || !task.dueDate) return 0;
    const duration = Math.floor((task.dueDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    return (duration / totalDays) * 100;
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'blocked': return '#ef4444';
      case 'pending': return '#6b7280';
      default: return '#9ca3af';
    }
  }
  
  function generateTimelineHeaders() {
    const headers = [];
    const current = new Date(timelineStart);
    
    while (current <= timelineEnd) {
      if (timeScale === 'day') {
        headers.push({
          label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: new Date(current)
        });
        current.setDate(current.getDate() + 1);
      } else if (timeScale === 'week') {
        headers.push({
          label: `Week ${getWeekNumber(current)}`,
          date: new Date(current)
        });
        current.setDate(current.getDate() + 7);
      } else if (timeScale === 'month') {
        headers.push({
          label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          date: new Date(current)
        });
        current.setMonth(current.getMonth() + 1);
      } else {
        headers.push({
          label: `Q${Math.floor(current.getMonth() / 3) + 1} ${current.getFullYear()}`,
          date: new Date(current)
        });
        current.setMonth(current.getMonth() + 3);
      }
    }
    
    return headers;
  }
  
  function getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  
  function exportSchedule() {
    const data = getFilteredTasks().map(task => ({
      'Project': getProjectName(task.projectId),
      'Task': task.title,
      'Status': task.status,
      'Priority': task.priority,
      'Start Date': task.startDate ? formatDate(task.startDate) : '',
      'Due Date': task.dueDate ? formatDate(task.dueDate) : '',
      'Assigned To': task.assignedTo || '',
      'Progress': `${task.percentComplete}%`,
      'Critical Path': task.criticalPath ? 'Yes' : 'No',
      'Milestone': task.milestone ? 'Yes' : 'No'
    }));
    
    // Convert to CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `master-schedule-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  $: filteredTasks = getFilteredTasks();
  $: timelineHeaders = generateTimelineHeaders();
  $: todayPosition = getPositionFromDate(new Date());
</script>

<div class="master-schedule">
  <div class="schedule-header">
    <h2>Master Schedule</h2>
    <div class="schedule-actions">
      <button class="btn-secondary" on:click={exportSchedule}>
        📥 Export Schedule
      </button>
    </div>
  </div>
  
  <div class="schedule-controls">
    <div class="filters">
      <select bind:value={filterByProject}>
        <option value="all">All Projects</option>
        {#each allProjects as project}
          <option value={project.id}>{project.name}</option>
        {/each}
      </select>
      
      <select bind:value={filterByStatus}>
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="blocked">Blocked</option>
      </select>
      
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={showCriticalPathOnly} />
        Critical Path Only
      </label>
      
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={showMilestonesOnly} />
        Milestones Only
      </label>
    </div>
    
    <div class="view-controls">
      <div class="view-mode">
        <button 
          class:active={viewMode === 'timeline'}
          on:click={() => viewMode = 'timeline'}
        >
          Timeline
        </button>
        <button 
          class:active={viewMode === 'calendar'}
          on:click={() => viewMode = 'calendar'}
        >
          Calendar
        </button>
        <button 
          class:active={viewMode === 'list'}
          on:click={() => viewMode = 'list'}
        >
          List
        </button>
      </div>
      
      {#if viewMode === 'timeline'}
        <div class="time-scale">
          <button 
            class:active={timeScale === 'day'}
            on:click={() => timeScale = 'day'}
          >
            Day
          </button>
          <button 
            class:active={timeScale === 'week'}
            on:click={() => timeScale = 'week'}
          >
            Week
          </button>
          <button 
            class:active={timeScale === 'month'}
            on:click={() => timeScale = 'month'}
          >
            Month
          </button>
          <button 
            class:active={timeScale === 'quarter'}
            on:click={() => timeScale = 'quarter'}
          >
            Quarter
          </button>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="schedule-view">
    {#if viewMode === 'timeline'}
      <div class="timeline-view">
        <div class="timeline-header">
          <div class="timeline-labels">Project / Task</div>
          <div class="timeline-dates">
            {#each timelineHeaders as header}
              <div class="timeline-date">{header.label}</div>
            {/each}
          </div>
        </div>
        
        <div class="timeline-body">
          {#each allProjects as project}
            {@const projectTasks = filteredTasks.filter(t => t.projectId === project.id)}
            {#if projectTasks.length > 0}
              <div class="project-group">
                <div class="project-header">
                  <span class="project-name">{project.name}</span>
                  <span class="task-count">{projectTasks.length} tasks</span>
                </div>
                
                {#each projectTasks as task}
                  <div class="timeline-row">
                    <div class="task-info">
                      <span class="task-name" class:milestone={task.milestone}>
                        {#if task.milestone}🎯{/if}
                        {#if task.criticalPath}🔥{/if}
                        {task.title}
                      </span>
                      <span class="task-meta">{task.assignedTo || 'Unassigned'}</span>
                    </div>
                    
                    <div class="timeline-bar-container">
                      {#if task.startDate && task.dueDate}
                        <div 
                          class="timeline-bar"
                          style="
                            left: {getPositionFromDate(task.startDate)}%;
                            width: {getTaskWidth(task)}%;
                            background: {getStatusColor(task.status)};
                          "
                        >
                          <div 
                            class="progress-fill"
                            style="width: {task.percentComplete}%"
                          ></div>
                          <span class="progress-text">{task.percentComplete}%</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          {/each}
          
          <!-- Today line -->
          <div class="today-line" style="left: {todayPosition}%">
            <span>Today</span>
          </div>
        </div>
      </div>
      
    {:else if viewMode === 'calendar'}
      <div class="calendar-view">
        <div class="calendar-header">
          <button class="calendar-nav">◀</button>
          <h3>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <button class="calendar-nav">▶</button>
        </div>
        
        <div class="calendar-grid">
          <div class="calendar-weekdays">
            {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
              <div class="weekday">{day}</div>
            {/each}
          </div>
          
          <div class="calendar-days">
            <!-- Calendar implementation would go here -->
            <p class="coming-soon">Calendar view coming soon...</p>
          </div>
        </div>
      </div>
      
    {:else if viewMode === 'list'}
      <div class="list-view">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Task</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Start Date</th>
              <th>Due Date</th>
              <th>Assigned To</th>
              <th>Progress</th>
              <th>Dependencies</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredTasks as task}
              <tr class:critical={task.criticalPath}>
                <td>{getProjectName(task.projectId)}</td>
                <td>
                  {#if task.milestone}🎯{/if}
                  {#if task.criticalPath}🔥{/if}
                  {task.title}
                </td>
                <td>
                  <span class="status-badge" style="background: {getStatusColor(task.status)}">
                    {task.status}
                  </span>
                </td>
                <td>
                  <span class="priority-{task.priority}">{task.priority}</span>
                </td>
                <td>{task.startDate ? formatDate(task.startDate) : '-'}</td>
                <td>{task.dueDate ? formatDate(task.dueDate) : '-'}</td>
                <td>{task.assignedTo || 'Unassigned'}</td>
                <td>
                  <div class="progress-cell">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: {task.percentComplete}%"></div>
                    </div>
                    <span>{task.percentComplete}%</span>
                  </div>
                </td>
                <td>{task.dependencies?.length || 0}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .master-schedule {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .schedule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .schedule-header h2 {
    margin: 0;
  }
  
  .schedule-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  
  .filters {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .filters select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .view-controls {
    display: flex;
    gap: 1rem;
  }
  
  .view-mode,
  .time-scale {
    display: flex;
    background: #f3f4f6;
    padding: 0.25rem;
    border-radius: 0.375rem;
  }
  
  .view-mode button,
  .time-scale button {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }
  
  .view-mode button:hover,
  .time-scale button:hover {
    background: #e5e7eb;
  }
  
  .view-mode button.active,
  .time-scale button.active {
    background: white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .schedule-view {
    flex: 1;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  
  /* Timeline View */
  .timeline-view {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .timeline-header {
    display: flex;
    border-bottom: 2px solid #e5e7eb;
    background: #f9fafb;
  }
  
  .timeline-labels {
    width: 300px;
    min-width: 300px;
    padding: 1rem;
    font-weight: 600;
    border-right: 1px solid #e5e7eb;
  }
  
  .timeline-dates {
    flex: 1;
    display: flex;
    overflow-x: auto;
  }
  
  .timeline-date {
    min-width: 100px;
    padding: 1rem;
    text-align: center;
    border-right: 1px solid #f3f4f6;
    font-size: 0.875rem;
  }
  
  .timeline-body {
    flex: 1;
    overflow: auto;
    position: relative;
  }
  
  .project-group {
    border-bottom: 1px solid #e5e7eb;
  }
  
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .project-name {
    font-weight: 600;
  }
  
  .task-count {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .timeline-row {
    display: flex;
    border-bottom: 1px solid #f3f4f6;
    position: relative;
  }
  
  .task-info {
    width: 300px;
    min-width: 300px;
    padding: 0.75rem 1rem;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
  }
  
  .task-name {
    font-weight: 500;
  }
  
  .task-name.milestone {
    color: #f59e0b;
  }
  
  .task-meta {
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  .timeline-bar-container {
    flex: 1;
    position: relative;
    height: 40px;
    margin: 0.5rem 0;
  }
  
  .timeline-bar {
    position: absolute;
    height: 30px;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .timeline-bar:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .progress-fill {
    position: absolute;
    height: 100%;
    background: rgba(255, 255, 255, 0.3);
  }
  
  .progress-text {
    position: relative;
    padding: 0 0.5rem;
    font-size: 0.75rem;
    color: white;
    font-weight: 600;
  }
  
  .today-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #ef4444;
    z-index: 10;
  }
  
  .today-line span {
    position: absolute;
    top: -20px;
    left: -20px;
    background: #ef4444;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  /* List View */
  .list-view {
    overflow: auto;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th {
    background: #f9fafb;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.875rem;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
  }
  
  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f3f4f6;
  }
  
  tr:hover {
    background: #f9fafb;
  }
  
  tr.critical {
    background: #fef2f2;
  }
  
  .status-badge {
    font-size: 0.75rem;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .priority-high {
    color: #ef4444;
    font-weight: 600;
  }
  
  .priority-medium {
    color: #f59e0b;
  }
  
  .priority-low {
    color: #6b7280;
  }
  
  .progress-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .progress-bar {
    width: 60px;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: #3b82f6;
  }
  
  /* Calendar View */
  .calendar-view {
    padding: 2rem;
  }
  
  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .calendar-nav {
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    border: none;
    cursor: pointer;
    border-radius: 0.375rem;
  }
  
  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: #e5e7eb;
    margin-bottom: 1px;
  }
  
  .weekday {
    padding: 0.75rem;
    text-align: center;
    font-weight: 600;
    background: #f9fafb;
  }
  
  .coming-soon {
    text-align: center;
    padding: 4rem;
    color: #6b7280;
  }
  
  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover {
    background: #d1d5db;
  }
  
  @media (max-width: 768px) {
    .schedule-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .filters {
      flex-wrap: wrap;
    }
    
    .timeline-labels,
    .task-info {
      width: 200px;
      min-width: 200px;
    }
  }
</style>