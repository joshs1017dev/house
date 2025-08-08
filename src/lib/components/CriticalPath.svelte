<script lang="ts">
  import type { Task } from '../db/database';
  
  export let tasks: Task[];
  
  // Filter and sort tasks by critical path
  $: criticalTasks = tasks
    .filter(t => t.criticalPath)
    .sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      return a.startDate.getTime() - b.startDate.getTime();
    });
  
  $: totalDuration = criticalTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  $: totalDays = Math.ceil(totalDuration / 8); // Assuming 8-hour work days
  
  $: projectEndDate = criticalTasks.length > 0 && criticalTasks[criticalTasks.length - 1].dueDate
    ? criticalTasks[criticalTasks.length - 1].dueDate
    : null;
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
  
  function getDelayImpact(task: Task): number {
    // Calculate how many tasks depend on this one
    return tasks.filter(t => t.dependencies?.includes(task.id!)).length;
  }
  
  function getFloatTime(task: Task): number {
    if (!task.earlyStart || !task.lateStart) return 0;
    return task.lateStart - task.earlyStart;
  }
</script>

<div class="critical-path">
  <div class="path-header">
    <h3>🎯 Critical Path Analysis</h3>
    <div class="path-summary">
      <div class="summary-item">
        <span class="label">Total Duration:</span>
        <span class="value">{totalDuration} hours ({totalDays} days)</span>
      </div>
      <div class="summary-item">
        <span class="label">Critical Tasks:</span>
        <span class="value">{criticalTasks.length}</span>
      </div>
      {#if projectEndDate}
        <div class="summary-item">
          <span class="label">Project End:</span>
          <span class="value">{formatDate(projectEndDate)}</span>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="path-visualization">
    <div class="path-line">
      {#each criticalTasks as task, index}
        <div class="path-node">
          <div class="node-connector">
            {#if index > 0}
              <div class="connector-line"></div>
            {/if}
            <div class="node-circle" class:milestone={task.milestone}>
              {index + 1}
            </div>
            {#if index < criticalTasks.length - 1}
              <div class="connector-line"></div>
            {/if}
          </div>
          
          <div class="node-content">
            <h4>{task.title}</h4>
            <div class="task-details">
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">{task.estimatedHours || 0} hours</span>
              </div>
              {#if task.startDate && task.dueDate}
                <div class="detail-row">
                  <span class="detail-label">Schedule:</span>
                  <span class="detail-value">
                    {formatDate(task.startDate)} - {formatDate(task.dueDate)}
                  </span>
                </div>
              {/if}
              <div class="detail-row">
                <span class="detail-label">Float Time:</span>
                <span class="detail-value">{getFloatTime(task)} hours</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Impact:</span>
                <span class="detail-value impact-{getDelayImpact(task) > 2 ? 'high' : getDelayImpact(task) > 0 ? 'medium' : 'low'}">
                  {getDelayImpact(task)} dependent tasks
                </span>
              </div>
              {#if task.assignedTo}
                <div class="detail-row">
                  <span class="detail-label">Assigned:</span>
                  <span class="detail-value">{task.assignedTo}</span>
                </div>
              {/if}
            </div>
            
            {#if task.risks && task.risks.length > 0}
              <div class="task-risks">
                <strong>⚠️ Risks:</strong>
                <ul>
                  {#each task.risks as risk}
                    <li>{risk}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
  
  <div class="path-insights">
    <h4>💡 Critical Path Insights</h4>
    <div class="insights-grid">
      <div class="insight-card">
        <div class="insight-icon">⏱️</div>
        <div class="insight-content">
          <h5>Time Sensitivity</h5>
          <p>Any delay in critical path tasks will directly impact the project end date.</p>
        </div>
      </div>
      
      <div class="insight-card">
        <div class="insight-icon">🔗</div>
        <div class="insight-content">
          <h5>Dependencies</h5>
          <p>{tasks.filter(t => t.dependencies && t.dependencies.length > 0).length} tasks have dependencies that must be managed.</p>
        </div>
      </div>
      
      <div class="insight-card">
        <div class="insight-icon">📊</div>
        <div class="insight-content">
          <h5>Resource Focus</h5>
          <p>Prioritize resources for critical path tasks to avoid project delays.</p>
        </div>
      </div>
      
      <div class="insight-card">
        <div class="insight-icon">🎯</div>
        <div class="insight-content">
          <h5>Milestones</h5>
          <p>{criticalTasks.filter(t => t.milestone).length} critical milestones must be met on schedule.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .critical-path {
    padding: 1rem;
  }
  
  .path-header {
    margin-bottom: 2rem;
  }
  
  .path-header h3 {
    margin-bottom: 1rem;
  }
  
  .path-summary {
    display: flex;
    gap: 2rem;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius);
  }
  
  .summary-item {
    display: flex;
    flex-direction: column;
  }
  
  .summary-item .label {
    font-size: 0.875rem;
    color: var(--gray-600);
  }
  
  .summary-item .value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--gray-900);
  }
  
  .path-visualization {
    margin: 2rem 0;
    padding: 2rem;
    background: white;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    overflow-x: auto;
  }
  
  .path-line {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    position: relative;
    padding-left: 3rem;
  }
  
  .path-node {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
  }
  
  .node-connector {
    position: absolute;
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
  }
  
  .connector-line {
    width: 3px;
    flex: 1;
    background: var(--danger);
  }
  
  .node-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--danger);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.125rem;
    flex-shrink: 0;
    z-index: 1;
  }
  
  .node-circle.milestone {
    background: var(--warning);
    width: 50px;
    height: 50px;
  }
  
  .node-content {
    flex: 1;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius);
    border: 1px solid var(--gray-200);
  }
  
  .node-content h4 {
    margin: 0 0 1rem;
    color: var(--gray-900);
  }
  
  .task-details {
    display: grid;
    gap: 0.5rem;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }
  
  .detail-label {
    color: var(--gray-600);
  }
  
  .detail-value {
    font-weight: 500;
    color: var(--gray-900);
  }
  
  .detail-value.impact-high {
    color: var(--danger);
  }
  
  .detail-value.impact-medium {
    color: var(--warning);
  }
  
  .detail-value.impact-low {
    color: var(--secondary);
  }
  
  .task-risks {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--gray-200);
    font-size: 0.875rem;
  }
  
  .task-risks strong {
    color: var(--warning);
  }
  
  .task-risks ul {
    margin: 0.5rem 0 0 1.5rem;
    padding: 0;
  }
  
  .task-risks li {
    color: var(--gray-700);
  }
  
  .path-insights {
    margin-top: 3rem;
  }
  
  .path-insights h4 {
    margin-bottom: 1.5rem;
  }
  
  .insights-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .insight-card {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--gray-50);
    border-radius: var(--radius);
    border: 1px solid var(--gray-200);
  }
  
  .insight-icon {
    font-size: 2rem;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: var(--radius);
  }
  
  .insight-content h5 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  
  .insight-content p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--gray-600);
    line-height: 1.5;
  }
  
  @media (max-width: 768px) {
    .path-summary {
      flex-direction: column;
      gap: 1rem;
    }
    
    .path-line {
      padding-left: 2rem;
    }
    
    .node-circle {
      width: 30px;
      height: 30px;
      font-size: 0.875rem;
    }
  }
</style>