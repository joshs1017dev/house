<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { projects, activeProjects } from '../stores/projects';
  import { db } from '../db/database';
  import type { Project, Task, Expense, Maintenance } from '../db/database';
  import { format, differenceInDays, addDays } from 'date-fns';
  
  const dispatch = createEventDispatcher();
  
  let totalBudget = 0;
  let totalSpent = 0;
  let activeProjectsCount = 0;
  let upcomingTasks: (Task & { projectName: string })[] = [];
  let upcomingMaintenance: Maintenance[] = [];
  let recentExpenses: (Expense & { projectName: string })[] = [];
  
  $: activeProjectsCount = $activeProjects.length;
  
  onMount(async () => {
    await loadDashboardData();
  });
  
  async function loadDashboardData() {
    // Calculate totals from projects
    const allProjects = await db.projects.toArray();
    totalBudget = allProjects.reduce((sum, p) => sum + p.budget, 0);
    totalSpent = allProjects.reduce((sum, p) => sum + p.actualCost, 0);
    
    // Get upcoming tasks (next 7 days)
    const now = new Date();
    const weekFromNow = addDays(now, 7);
    const tasks = await db.tasks
      .where('dueDate')
      .between(now, weekFromNow)
      .and(t => t.status !== 'completed')
      .toArray();
    
    // Add project names to tasks
    const taskProjects = await Promise.all(
      tasks.map(async (task) => {
        const project = await db.projects.get(task.projectId);
        return {
          ...task,
          projectName: project?.name || 'Unknown'
        };
      })
    );
    upcomingTasks = taskProjects.sort((a, b) => 
      (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)
    );
    
    // Get upcoming maintenance
    upcomingMaintenance = await db.maintenance
      .where('nextDue')
      .between(now, weekFromNow)
      .toArray();
    
    // Get recent expenses (last 30 days)
    const thirtyDaysAgo = addDays(now, -30);
    const expenses = await db.expenses
      .where('date')
      .above(thirtyDaysAgo)
      .reverse()
      .limit(5)
      .toArray();
    
    // Add project names to expenses
    const expenseProjects = await Promise.all(
      expenses.map(async (expense) => {
        const project = await db.projects.get(expense.projectId);
        return {
          ...expense,
          projectName: project?.name || 'Unknown'
        };
      })
    );
    recentExpenses = expenseProjects;
  }
  
  function selectProject(projectId: number) {
    dispatch('selectProject', projectId);
  }
  
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function getDaysUntil(date: Date) {
    return differenceInDays(date, new Date());
  }
</script>

<div class="dashboard">
  <div class="container p-6">
    <h1>Dashboard</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Active Projects</div>
        <div class="stat-value">{activeProjectsCount}</div>
        <div class="stat-detail">In progress</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Total Budget</div>
        <div class="stat-value">{formatCurrency(totalBudget)}</div>
        <div class="stat-detail">Allocated</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Total Spent</div>
        <div class="stat-value">{formatCurrency(totalSpent)}</div>
        <div class="stat-detail">{((totalSpent / totalBudget) * 100).toFixed(0)}% of budget</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Budget Remaining</div>
        <div class="stat-value">{formatCurrency(totalBudget - totalSpent)}</div>
        <div class="stat-detail">Available</div>
      </div>
    </div>
    
    <div class="dashboard-grid">
      <div class="dashboard-section">
        <h2>Active Projects</h2>
        {#if $activeProjects.length === 0}
          <p class="empty-state">No active projects. Start a new project to get going!</p>
        {:else}
          <div class="project-cards">
            {#each $activeProjects as project}
              <button 
                class="project-card"
                on:click={() => selectProject(project.id!)}
              >
                <div class="project-header">
                  <h3>{project.name}</h3>
                  <span class="badge primary">{project.status}</span>
                </div>
                <p class="project-description">{project.description}</p>
                <div class="project-stats">
                  <div class="project-stat">
                    <span class="stat-icon">💰</span>
                    <span>{formatCurrency(project.actualCost)} / {formatCurrency(project.budget)}</span>
                  </div>
                  <div class="project-progress">
                    <div 
                      class="progress-bar"
                      style="width: {(project.actualCost / project.budget) * 100}%"
                    ></div>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="dashboard-section">
        <h2>Upcoming Tasks</h2>
        {#if upcomingTasks.length === 0}
          <p class="empty-state">No upcoming tasks in the next 7 days</p>
        {:else}
          <div class="task-list">
            {#each upcomingTasks as task}
              <div class="task-item">
                <div class="task-info">
                  <div class="task-title">{task.title}</div>
                  <div class="task-project">{task.projectName}</div>
                </div>
                <div class="task-due">
                  {#if task.dueDate}
                    <span class="due-in">{getDaysUntil(task.dueDate)}d</span>
                    <span class="due-date">{format(task.dueDate, 'MMM d')}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="dashboard-section">
        <h2>Recent Expenses</h2>
        {#if recentExpenses.length === 0}
          <p class="empty-state">No recent expenses</p>
        {:else}
          <div class="expense-list">
            {#each recentExpenses as expense}
              <div class="expense-item">
                <div class="expense-info">
                  <div class="expense-description">{expense.description}</div>
                  <div class="expense-project">{expense.projectName}</div>
                </div>
                <div class="expense-amount">
                  {formatCurrency(expense.amount)}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="dashboard-section">
        <h2>Maintenance Schedule</h2>
        {#if upcomingMaintenance.length === 0}
          <p class="empty-state">No upcoming maintenance in the next 7 days</p>
        {:else}
          <div class="maintenance-list">
            {#each upcomingMaintenance as item}
              <div class="maintenance-item">
                <div class="maintenance-info">
                  <div class="maintenance-title">{item.title}</div>
                  <div class="maintenance-frequency">{item.frequency}</div>
                </div>
                <div class="maintenance-due">
                  <span class="due-date">{format(item.nextDue, 'MMM d')}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard {
    min-height: 100%;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
  }
  
  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.5rem;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 600;
    color: var(--gray-900);
  }
  
  .stat-detail {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: 0.25rem;
  }
  
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }
  
  .dashboard-section {
    background: white;
    padding: 1.5rem;
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  
  .dashboard-section h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
  
  .empty-state {
    color: var(--gray-500);
    font-size: 0.875rem;
    text-align: center;
    padding: 2rem 0;
  }
  
  .project-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .project-card {
    text-align: left;
    padding: 1rem;
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-sm);
    transition: all 0.2s;
    width: 100%;
  }
  
  .project-card:hover {
    background: white;
    border-color: var(--primary);
    transform: none;
  }
  
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.5rem;
  }
  
  .project-header h3 {
    font-size: 1rem;
    margin: 0;
  }
  
  .project-description {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 1rem;
  }
  
  .project-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .project-stat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--gray-700);
  }
  
  .project-progress {
    height: 4px;
    background: var(--gray-200);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: var(--primary);
    transition: width 0.3s;
  }
  
  .task-list,
  .expense-list,
  .maintenance-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .task-item,
  .expense-item,
  .maintenance-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--gray-50);
    border-radius: var(--radius-sm);
  }
  
  .task-title,
  .expense-description,
  .maintenance-title {
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .task-project,
  .expense-project,
  .maintenance-frequency {
    font-size: 0.75rem;
    color: var(--gray-600);
  }
  
  .task-due,
  .maintenance-due {
    text-align: right;
  }
  
  .due-in {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--warning);
  }
  
  .due-date {
    font-size: 0.75rem;
    color: var(--gray-600);
  }
  
  .expense-amount {
    font-weight: 600;
    color: var(--danger);
  }
</style>