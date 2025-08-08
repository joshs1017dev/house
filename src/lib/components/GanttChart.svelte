<script lang="ts">
  import { onMount } from 'svelte';
  import type { ProjectPhase, Task } from '../db/database';
  
  export let phases: ProjectPhase[];
  export let tasks: Task[];
  
  let chartContainer: HTMLDivElement;
  let scrollPosition = { x: 0, y: 0 };
  let zoomLevel = 1;
  let viewMode: 'days' | 'weeks' | 'months' = 'weeks';
  
  // Calculate project timeline bounds
  $: projectStart = phases.length > 0 
    ? new Date(Math.min(...phases.map(p => p.startDate.getTime())))
    : new Date();
    
  $: projectEnd = phases.length > 0
    ? new Date(Math.max(...phases.map(p => p.endDate.getTime())))
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days default
  
  $: totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000));
  
  // Calculate scale based on view mode
  $: dayWidth = viewMode === 'days' ? 40 : viewMode === 'weeks' ? 20 : 10;
  $: scaledDayWidth = dayWidth * zoomLevel;
  
  function getTaskPosition(task: Task) {
    if (!task.startDate || !task.dueDate) return null;
    
    const start = Math.floor((task.startDate.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000));
    const duration = Math.ceil((task.dueDate.getTime() - task.startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    return {
      left: start * scaledDayWidth,
      width: duration * scaledDayWidth,
      progress: task.percentComplete || 0
    };
  }
  
  function getPhasePosition(phase: ProjectPhase) {
    const start = Math.floor((phase.startDate.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000));
    const duration = Math.ceil((phase.endDate.getTime() - phase.startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    return {
      left: start * scaledDayWidth,
      width: duration * scaledDayWidth
    };
  }
  
  function formatDateHeader(date: Date): string {
    if (viewMode === 'days') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (viewMode === 'weeks') {
      return `Week ${getWeekNumber(date)}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  }
  
  function getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  
  function generateTimelineHeaders() {
    const headers = [];
    const current = new Date(projectStart);
    
    while (current <= projectEnd) {
      headers.push({
        date: new Date(current),
        label: formatDateHeader(current)
      });
      
      if (viewMode === 'days') {
        current.setDate(current.getDate() + 1);
      } else if (viewMode === 'weeks') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return headers;
  }
  
  function handleZoom(delta: number) {
    zoomLevel = Math.max(0.5, Math.min(2, zoomLevel + delta));
  }
  
  function getTaskColor(task: Task): string {
    if (task.criticalPath) return '#ef4444';
    if (task.milestone) return '#f59e0b';
    if (task.status === 'completed') return '#10b981';
    if (task.status === 'blocked') return '#6b7280';
    return '#3b82f6';
  }
  
  function drawDependencies(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    
    tasks.forEach((task, index) => {
      if (!task.dependencies || task.dependencies.length === 0) return;
      
      const taskPos = getTaskPosition(task);
      if (!taskPos) return;
      
      task.dependencies.forEach(depId => {
        const depTask = tasks.find(t => t.id === depId);
        if (!depTask) return;
        
        const depPos = getTaskPosition(depTask);
        if (!depPos) return;
        
        const depIndex = tasks.indexOf(depTask);
        
        // Draw arrow from dependency to task
        ctx.beginPath();
        ctx.moveTo(depPos.left + depPos.width, 40 + depIndex * 60 + 20);
        ctx.lineTo(taskPos.left - 10, 40 + index * 60 + 20);
        
        // Arrow head
        ctx.lineTo(taskPos.left - 10, 40 + index * 60 + 15);
        ctx.moveTo(taskPos.left - 10, 40 + index * 60 + 20);
        ctx.lineTo(taskPos.left - 10, 40 + index * 60 + 25);
        
        ctx.stroke();
      });
    });
  }
  
  onMount(() => {
    // Initialize dependency lines
    const canvas = chartContainer.querySelector('canvas');
    if (canvas) {
      canvas.width = chartContainer.scrollWidth;
      canvas.height = chartContainer.scrollHeight;
      drawDependencies(canvas);
    }
  });
  
  $: timelineHeaders = generateTimelineHeaders();
</script>

<div class="gantt-chart">
  <div class="gantt-controls">
    <div class="view-controls">
      <button
        class="view-btn"
        class:active={viewMode === 'days'}
        on:click={() => viewMode = 'days'}
      >
        Days
      </button>
      <button
        class="view-btn"
        class:active={viewMode === 'weeks'}
        on:click={() => viewMode = 'weeks'}
      >
        Weeks
      </button>
      <button
        class="view-btn"
        class:active={viewMode === 'months'}
        on:click={() => viewMode = 'months'}
      >
        Months
      </button>
    </div>
    
    <div class="zoom-controls">
      <button class="zoom-btn" on:click={() => handleZoom(-0.1)}>-</button>
      <span class="zoom-level">{Math.round(zoomLevel * 100)}%</span>
      <button class="zoom-btn" on:click={() => handleZoom(0.1)}>+</button>
    </div>
  </div>
  
  <div class="gantt-container" bind:this={chartContainer}>
    <div class="gantt-sidebar">
      <div class="sidebar-header">Tasks</div>
      {#each phases as phase}
        <div class="phase-group">
          <div class="phase-label">{phase.name}</div>
          {#each tasks.filter(t => t.phaseId === phase.id) as task}
            <div class="task-label" class:milestone={task.milestone}>
              {task.milestone ? '🎯' : '📋'} {task.title}
            </div>
          {/each}
        </div>
      {/each}
    </div>
    
    <div class="gantt-timeline">
      <canvas class="dependency-canvas"></canvas>
      
      <div class="timeline-header">
        {#each timelineHeaders as header}
          <div 
            class="time-column"
            style="width: {scaledDayWidth * (viewMode === 'days' ? 1 : viewMode === 'weeks' ? 7 : 30)}px"
          >
            {header.label}
          </div>
        {/each}
      </div>
      
      <div class="timeline-body">
        {#each phases as phase}
          <div class="phase-row">
            <div 
              class="phase-bar"
              style="
                left: {getPhasePosition(phase).left}px;
                width: {getPhasePosition(phase).width}px;
              "
            >
              <div class="phase-name">{phase.name}</div>
            </div>
          </div>
          
          {#each tasks.filter(t => t.phaseId === phase.id) as task}
            {@const pos = getTaskPosition(task)}
            {#if pos}
              <div class="task-row">
                <div 
                  class="task-bar"
                  class:critical={task.criticalPath}
                  class:milestone={task.milestone}
                  style="
                    left: {pos.left}px;
                    width: {pos.width}px;
                    background: {getTaskColor(task)};
                  "
                >
                  <div 
                    class="task-progress"
                    style="width: {pos.progress}%"
                  ></div>
                  <span class="task-name">{task.title}</span>
                </div>
              </div>
            {/if}
          {/each}
        {/each}
      </div>
      
      <!-- Today line -->
      {#if true}
        {@const todayOffset = Math.floor((new Date().getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)) * scaledDayWidth}
        <div 
          class="today-line"
          style="left: {todayOffset}px"
        >
          <span class="today-label">Today</span>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="gantt-legend">
    <div class="legend-item">
      <div class="legend-color" style="background: #3b82f6"></div>
      <span>Regular Task</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #ef4444"></div>
      <span>Critical Path</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #f59e0b"></div>
      <span>Milestone</span>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #10b981"></div>
      <span>Completed</span>
    </div>
  </div>
</div>

<style>
  .gantt-chart {
    width: 100%;
    height: 600px;
    display: flex;
    flex-direction: column;
  }
  
  .gantt-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius);
  }
  
  .view-controls,
  .zoom-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .view-btn,
  .zoom-btn {
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid var(--gray-300);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .view-btn:hover,
  .zoom-btn:hover {
    background: var(--gray-100);
  }
  
  .view-btn.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }
  
  .zoom-level {
    min-width: 50px;
    text-align: center;
    font-weight: 600;
  }
  
  .gantt-container {
    flex: 1;
    display: flex;
    overflow: auto;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius);
    background: white;
    position: relative;
  }
  
  .gantt-sidebar {
    width: 250px;
    min-width: 250px;
    border-right: 2px solid var(--gray-200);
    background: var(--gray-50);
  }
  
  .sidebar-header {
    padding: 1rem;
    font-weight: 600;
    border-bottom: 1px solid var(--gray-200);
    background: white;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .phase-group {
    border-bottom: 1px solid var(--gray-200);
  }
  
  .phase-label {
    padding: 0.75rem 1rem;
    font-weight: 600;
    background: var(--gray-100);
    border-bottom: 1px solid var(--gray-200);
  }
  
  .task-label {
    padding: 0.75rem 1rem 0.75rem 2rem;
    border-bottom: 1px solid var(--gray-100);
    height: 60px;
    display: flex;
    align-items: center;
  }
  
  .task-label.milestone {
    font-weight: 600;
  }
  
  .gantt-timeline {
    flex: 1;
    position: relative;
    overflow-x: auto;
  }
  
  .dependency-canvas {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 1;
  }
  
  .timeline-header {
    display: flex;
    border-bottom: 2px solid var(--gray-200);
    background: white;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .time-column {
    padding: 0.75rem 0.5rem;
    text-align: center;
    border-right: 1px solid var(--gray-100);
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .timeline-body {
    position: relative;
  }
  
  .phase-row {
    height: 40px;
    position: relative;
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-200);
  }
  
  .phase-bar {
    position: absolute;
    top: 5px;
    height: 30px;
    background: var(--gray-300);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    z-index: 2;
  }
  
  .phase-name {
    font-weight: 600;
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .task-row {
    height: 60px;
    position: relative;
    border-bottom: 1px solid var(--gray-100);
  }
  
  .task-bar {
    position: absolute;
    top: 15px;
    height: 30px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    color: white;
    font-size: 0.875rem;
    overflow: hidden;
    z-index: 3;
    transition: all 0.2s;
  }
  
  .task-bar:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }
  
  .task-bar.milestone {
    border-radius: 50%;
    width: 30px !important;
    height: 30px;
    padding: 0;
    justify-content: center;
  }
  
  .task-bar.milestone .task-name {
    display: none;
  }
  
  .task-progress {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-sm);
  }
  
  .task-name {
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .today-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--danger);
    z-index: 5;
  }
  
  .today-label {
    position: absolute;
    top: -20px;
    left: -20px;
    background: var(--danger);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .gantt-legend {
    display: flex;
    gap: 2rem;
    justify-content: center;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius);
    margin-top: 1rem;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .legend-color {
    width: 20px;
    height: 12px;
    border-radius: var(--radius-sm);
  }
  
  @media (max-width: 768px) {
    .gantt-sidebar {
      width: 150px;
      min-width: 150px;
    }
    
    .gantt-controls {
      flex-direction: column;
      gap: 1rem;
    }
  }
</style>