<script lang="ts">
  import { onMount } from 'svelte';
  import { projects, projectStats, tasks, expenses } from '../stores';
  import { createEventDispatcher } from 'svelte';
  import Chart from 'chart.js/auto';
  
  const dispatch = createEventDispatcher();
  
  let statsData = {
    totalBudget: 0,
    totalSpent: 0,
    remaining: 0,
    activeCount: 0,
    completedCount: 0,
    totalCount: 0
  };
  
  let recentProjects: any[] = [];
  let upcomingTasks: any[] = [];
  let budgetChartCanvas: HTMLCanvasElement;
  let budgetChart: Chart;
  
  const unsubscribe = projectStats.subscribe(stats => {
    statsData = stats;
    updateBudgetChart();
  });
  
  onMount(async () => {
    await loadDashboardData();
    createBudgetChart();
    
    return () => {
      unsubscribe();
      if (budgetChart) budgetChart.destroy();
    };
  });
  
  async function loadDashboardData() {
    await projects.load();
    await tasks.load();
    await expenses.load();
    
    // Get recent projects
    const allProjects = await projects.load();
    projects.subscribe(p => {
      recentProjects = p
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5);
    })();
    
    // Get upcoming tasks
    const allTasks = await tasks.load();
    tasks.subscribe(t => {
      upcomingTasks = t
        .filter(task => task.status !== 'completed' && task.dueDate)
        .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
        .slice(0, 5);
    })();
  }
  
  function createBudgetChart() {
    if (!budgetChartCanvas) return;
    
    const ctx = budgetChartCanvas.getContext('2d');
    if (!ctx) return;
    
    budgetChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Spent', 'Remaining'],
        datasets: [{
          data: [statsData.totalSpent, Math.max(0, statsData.remaining)],
          backgroundColor: ['#ef4444', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: $${value.toLocaleString()}`;
              }
            }
          }
        }
      }
    });
  }
  
  function updateBudgetChart() {
    if (budgetChart) {
      budgetChart.data.datasets[0].data = [
        statsData.totalSpent,
        Math.max(0, statsData.remaining)
      ];
      budgetChart.update();
    }
  }
  
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'var(--primary)';
      case 'completed': return 'var(--secondary)';
      case 'paused': return 'var(--warning)';
      case 'planning': return 'var(--gray-500)';
      default: return 'var(--gray-400)';
    }
  }
</script>

<div class="dashboard">
  <h1>Dashboard</h1>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">📊</div>
      <div class="stat-content">
        <div class="stat-label">Active Projects</div>
        <div class="stat-value">{statsData.activeCount}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-content">
        <div class="stat-label">Completed</div>
        <div class="stat-value">{statsData.completedCount}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">💰</div>
      <div class="stat-content">
        <div class="stat-label">Total Budget</div>
        <div class="stat-value">{formatCurrency(statsData.totalBudget)}</div>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">💸</div>
      <div class="stat-content">
        <div class="stat-label">Total Spent</div>
        <div class="stat-value">{formatCurrency(statsData.totalSpent)}</div>
      </div>
    </div>
  </div>
  
  <div class="dashboard-grid">
    <div class="card">
      <h2>Budget Overview</h2>
      <div class="chart-container">
        <canvas bind:this={budgetChartCanvas}></canvas>
      </div>
      <div class="budget-details">
        <div class="budget-item">
          <span>Total Budget:</span>
          <span>{formatCurrency(statsData.totalBudget)}</span>
        </div>
        <div class="budget-item">
          <span>Spent:</span>
          <span class="text-danger">{formatCurrency(statsData.totalSpent)}</span>
        </div>
        <div class="budget-item">
          <span>Remaining:</span>
          <span class="text-success">{formatCurrency(statsData.remaining)}</span>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>Recent Projects</h2>
      {#if recentProjects.length > 0}
        <div class="project-list">
          {#each recentProjects as project}
            <button
              class="project-item"
              on:click={() => dispatch('selectProject', project.id)}
            >
              <div class="project-info">
                <h3>{project.name}</h3>
                <p>{project.description}</p>
              </div>
              <div class="project-meta">
                <span 
                  class="status-badge"
                  style="background: {getStatusColor(project.status)}"
                >
                  {project.status}
                </span>
                <span class="project-budget">{formatCurrency(project.budget)}</span>
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <p class="empty-state">No projects yet. Create your first project!</p>
      {/if}
    </div>
    
    <div class="card">
      <h2>Upcoming Tasks</h2>
      {#if upcomingTasks.length > 0}
        <div class="task-list">
          {#each upcomingTasks as task}
            <div class="task-item">
              <div class="task-info">
                <h4>{task.title}</h4>
                {#if task.dueDate}
                  <p class="due-date">Due: {formatDate(task.dueDate)}</p>
                {/if}
              </div>
              <span class="priority-badge priority-{task.priority}">
                {task.priority}
              </span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty-state">No upcoming tasks</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .dashboard {
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .stat-icon {
    font-size: 2.5rem;
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gray-100);
    border-radius: var(--radius);
  }
  
  .stat-content {
    flex: 1;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.25rem;
  }
  
  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--gray-900);
  }
  
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .chart-container {
    height: 250px;
    margin: 1rem 0;
  }
  
  .budget-details {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--gray-200);
  }
  
  .budget-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
  }
  
  .budget-item span:first-child {
    color: var(--gray-600);
  }
  
  .budget-item span:last-child {
    font-weight: 600;
  }
  
  .text-danger {
    color: var(--danger);
  }
  
  .text-success {
    color: var(--secondary);
  }
  
  .project-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .project-item {
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius);
    padding: 1rem;
    text-align: left;
    width: 100%;
    transition: all 0.2s;
  }
  
  .project-item:hover {
    background: white;
    border-color: var(--primary);
    transform: translateX(4px);
  }
  
  .project-info h3 {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }
  
  .project-info p {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0;
  }
  
  .project-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.5rem;
  }
  
  .status-badge {
    font-size: 0.75rem;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .project-budget {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-700);
  }
  
  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .task-item {
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius);
    padding: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .task-info h4 {
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
  }
  
  .due-date {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0;
  }
  
  .priority-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .priority-high {
    background: var(--danger);
    color: white;
  }
  
  .priority-medium {
    background: var(--warning);
    color: white;
  }
  
  .priority-low {
    background: var(--gray-400);
    color: white;
  }
  
  .empty-state {
    text-align: center;
    color: var(--gray-500);
    padding: 2rem 0;
  }
  
  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }
    
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }
</style>