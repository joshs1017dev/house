<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { expenses, projects } from '../stores';
  import type { Expense, Project } from '../db/database';
  import Chart from 'chart.js/auto';
  
  export let projectId: number;
  
  let projectExpenses: Expense[] = [];
  let showNewExpenseForm = false;
  let editingExpenseId: number | null = null;
  let categoryChartCanvas: HTMLCanvasElement;
  let timelineChartCanvas: HTMLCanvasElement;
  let categoryChart: Chart;
  let timelineChart: Chart;
  let project: Project | null = null;
  
  let newExpense = {
    category: 'material' as Expense['category'],
    description: '',
    amount: 0,
    date: formatDateForInput(new Date()),
    vendor: '',
    notes: ''
  };
  
  let editExpense = { ...newExpense };
  
  const categoryConfig = {
    material: { label: 'Materials', color: '#3b82f6' },
    labor: { label: 'Labor', color: '#10b981' },
    equipment: { label: 'Equipment', color: '#f59e0b' },
    permit: { label: 'Permits', color: '#8b5cf6' },
    other: { label: 'Other', color: '#6b7280' }
  };
  
  expenses.subscribe(e => {
    projectExpenses = e
      .filter(expense => expense.projectId === projectId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    updateCharts();
  });
  
  projects.subscribe(p => {
    project = p.find(proj => proj.id === projectId) || null;
  });
  
  onMount(async () => {
    await expenses.load(projectId);
    createCharts();
  });
  
  onDestroy(() => {
    if (categoryChart) categoryChart.destroy();
    if (timelineChart) timelineChart.destroy();
  });
  
  function createCharts() {
    if (!categoryChartCanvas || !timelineChartCanvas) return;
    
    // Category breakdown chart
    const categoryCtx = categoryChartCanvas.getContext('2d');
    if (categoryCtx) {
      categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
    
    // Timeline chart
    const timelineCtx = timelineChartCanvas.getContext('2d');
    if (timelineCtx) {
      timelineChart = new Chart(timelineCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Cumulative Expenses',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => '$' + value.toLocaleString()
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `Total: $${context.parsed.y.toLocaleString()}`;
                }
              }
            }
          }
        }
      });
    }
    
    updateCharts();
  }
  
  function updateCharts() {
    if (!categoryChart || !timelineChart) return;
    
    // Update category chart
    const categoryTotals = Object.keys(categoryConfig).reduce((acc, cat) => {
      acc[cat] = projectExpenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
      return acc;
    }, {} as Record<string, number>);
    
    const activeCategories = Object.entries(categoryTotals)
      .filter(([_, amount]) => amount > 0);
    
    categoryChart.data.labels = activeCategories.map(([cat]) => categoryConfig[cat as keyof typeof categoryConfig].label);
    categoryChart.data.datasets[0].data = activeCategories.map(([_, amount]) => amount);
    categoryChart.data.datasets[0].backgroundColor = activeCategories.map(([cat]) => categoryConfig[cat as keyof typeof categoryConfig].color);
    categoryChart.update();
    
    // Update timeline chart
    const sortedExpenses = [...projectExpenses].sort((a, b) => a.date.getTime() - b.date.getTime());
    let cumulative = 0;
    const timelineData = sortedExpenses.map(expense => {
      cumulative += expense.amount;
      return {
        x: formatDate(expense.date),
        y: cumulative
      };
    });
    
    timelineChart.data.labels = timelineData.map(d => d.x);
    timelineChart.data.datasets[0].data = timelineData.map(d => d.y);
    timelineChart.update();
  }
  
  async function addExpense() {
    if (!newExpense.description.trim() || newExpense.amount <= 0) {
      alert('Please enter expense description and amount');
      return;
    }
    
    await expenses.add({
      projectId,
      category: newExpense.category,
      description: newExpense.description.trim(),
      amount: parseFloat(newExpense.amount.toString()),
      date: new Date(newExpense.date),
      vendor: newExpense.vendor.trim() || undefined,
      notes: newExpense.notes.trim() || undefined,
      createdAt: new Date()
    });
    
    // Reset form
    newExpense = {
      category: 'material',
      description: '',
      amount: 0,
      date: formatDateForInput(new Date()),
      vendor: '',
      notes: ''
    };
    showNewExpenseForm = false;
    
    await expenses.load(projectId);
  }
  
  async function startEditExpense(expense: Expense) {
    editingExpenseId = expense.id || 0;
    editExpense = {
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: formatDateForInput(expense.date),
      vendor: expense.vendor || '',
      notes: expense.notes || ''
    };
  }
  
  async function saveEditExpense() {
    if (!editExpense.description.trim() || editExpense.amount <= 0) {
      alert('Please enter expense description and amount');
      return;
    }
    
    await expenses.update(editingExpenseId || 0, {
      category: editExpense.category,
      description: editExpense.description.trim(),
      amount: parseFloat(editExpense.amount.toString()),
      date: new Date(editExpense.date),
      vendor: editExpense.vendor.trim() || undefined,
      notes: editExpense.notes.trim() || undefined
    });
    
    editingExpenseId = null;
    await expenses.load(projectId);
  }
  
  async function deleteExpense(expenseId: number) {
    if (confirm('Are you sure you want to delete this expense?')) {
      await expenses.delete(expenseId);
      await expenses.load(projectId);
    }
  }
  
  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
  
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  $: totalExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
  $: budgetRemaining = (project?.budget || 0) - totalExpenses;
  $: budgetPercentage = project?.budget ? (totalExpenses / project.budget) * 100 : 0;
</script>

<div class="expenses-tracker">
  <div class="expenses-header">
    <h3>💰 Expense Tracking</h3>
    <button class="btn-primary" on:click={() => showNewExpenseForm = true}>
      ➕ Add Expense
    </button>
  </div>
  
  <div class="budget-summary card">
    <div class="summary-grid">
      <div class="summary-item">
        <span class="label">Budget</span>
        <span class="value">{formatCurrency(project?.budget || 0)}</span>
      </div>
      <div class="summary-item">
        <span class="label">Spent</span>
        <span class="value text-danger">{formatCurrency(totalExpenses)}</span>
      </div>
      <div class="summary-item">
        <span class="label">Remaining</span>
        <span class="value" class:text-success={budgetRemaining >= 0} class:text-danger={budgetRemaining < 0}>
          {formatCurrency(budgetRemaining)}
        </span>
      </div>
      <div class="summary-item">
        <span class="label">% Used</span>
        <span class="value" class:text-danger={budgetPercentage > 90}>
          {budgetPercentage.toFixed(1)}%
        </span>
      </div>
    </div>
    
    <div class="budget-progress">
      <div 
        class="progress-bar"
        style="width: {Math.min(100, budgetPercentage)}%; background: {budgetPercentage > 90 ? 'var(--danger)' : 'var(--primary)'}"
      ></div>
    </div>
  </div>
  
  {#if showNewExpenseForm}
    <div class="new-expense-form card">
      <h4>Add New Expense</h4>
      <form on:submit|preventDefault={addExpense}>
        <div class="form-row">
          <div class="form-group flex-2">
            <input
              type="text"
              bind:value={newExpense.description}
              placeholder="Expense description *"
              required
            />
          </div>
          
          <div class="form-group">
            <input
              type="number"
              bind:value={newExpense.amount}
              min="0.01"
              step="0.01"
              placeholder="Amount ($) *"
              required
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <select bind:value={newExpense.category}>
              {#each Object.entries(categoryConfig) as [value, config]}
                <option value={value}>{config.label}</option>
              {/each}
            </select>
          </div>
          
          <div class="form-group">
            <input
              type="date"
              bind:value={newExpense.date}
              required
            />
          </div>
        </div>
        
        <div class="form-group">
          <input
            type="text"
            bind:value={newExpense.vendor}
            placeholder="Vendor/Store (optional)"
          />
        </div>
        
        <div class="form-group">
          <textarea
            bind:value={newExpense.notes}
            placeholder="Notes (optional)"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" on:click={() => showNewExpenseForm = false}>
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Add Expense
          </button>
        </div>
      </form>
    </div>
  {/if}
  
  <div class="charts-grid">
    <div class="chart-container card">
      <h4>Expenses by Category</h4>
      <div class="chart-wrapper">
        <canvas bind:this={categoryChartCanvas}></canvas>
      </div>
    </div>
    
    <div class="chart-container card">
      <h4>Expense Timeline</h4>
      <div class="chart-wrapper">
        <canvas bind:this={timelineChartCanvas}></canvas>
      </div>
    </div>
  </div>
  
  <div class="expenses-list">
    <h4>Recent Expenses</h4>
    
    {#if projectExpenses.length === 0}
      <div class="empty-state">
        <p>No expenses recorded yet</p>
        <p class="text-sm text-gray">Start tracking your project costs</p>
      </div>
    {:else}
      <div class="expense-items">
        {#each projectExpenses as expense}
          <div class="expense-item card">
            {#if editingExpenseId === expense.id}
              <div class="edit-form">
                <div class="edit-row">
                  <input
                    type="text"
                    bind:value={editExpense.description}
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    bind:value={editExpense.amount}
                    min="0.01"
                    step="0.01"
                    placeholder="Amount"
                  />
                </div>
                <div class="edit-row">
                  <select bind:value={editExpense.category}>
                    {#each Object.entries(categoryConfig) as [value, config]}
                      <option value={value}>{config.label}</option>
                    {/each}
                  </select>
                  <input
                    type="date"
                    bind:value={editExpense.date}
                  />
                </div>
                <div class="edit-row">
                  <input
                    type="text"
                    bind:value={editExpense.vendor}
                    placeholder="Vendor"
                  />
                </div>
                <div class="edit-row">
                  <textarea
                    bind:value={editExpense.notes}
                    placeholder="Notes"
                    rows="2"
                  ></textarea>
                </div>
                <div class="edit-actions">
                  <button class="btn-secondary small" on:click={() => editingExpenseId = null}>
                    Cancel
                  </button>
                  <button class="btn-primary small" on:click={saveEditExpense}>
                    Save
                  </button>
                </div>
              </div>
            {:else}
              <div class="expense-content">
                <div class="expense-header">
                  <div>
                    <h5>{expense.description}</h5>
                    {#if expense.vendor}
                      <p class="vendor">{expense.vendor}</p>
                    {/if}
                  </div>
                  <div class="expense-amount">
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
                
                <div class="expense-meta">
                  <span class="category-badge" style="background: {categoryConfig[expense.category].color}">
                    {categoryConfig[expense.category].label}
                  </span>
                  <span class="date">{formatDate(expense.date)}</span>
                </div>
                
                {#if expense.notes}
                  <p class="expense-notes">{expense.notes}</p>
                {/if}
                
                <div class="expense-actions">
                  <button class="icon-btn" on:click={() => startEditExpense(expense)}>
                    ✏️
                  </button>
                  <button class="icon-btn danger" on:click={() => deleteExpense(expense.id || 0)}>
                    🗑️
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .expenses-tracker {
    height: 100%;
  }
  
  .expenses-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .expenses-header h3 {
    margin: 0;
  }
  
  .budget-summary {
    margin-bottom: 2rem;
  }
  
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .summary-item {
    text-align: center;
  }
  
  .summary-item .label {
    display: block;
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 0.25rem;
  }
  
  .summary-item .value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .text-success {
    color: var(--secondary);
  }
  
  .text-danger {
    color: var(--danger);
  }
  
  .budget-progress {
    height: 8px;
    background: var(--gray-200);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .new-expense-form {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }
  
  .new-expense-form h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  .form-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    flex: 1;
  }
  
  .form-group.flex-2 {
    flex: 2;
  }
  
  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
  }
  
  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .chart-container h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  .chart-wrapper {
    height: 250px;
  }
  
  .expenses-list h4 {
    margin-bottom: 1rem;
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--gray-600);
  }
  
  .text-sm {
    font-size: 0.875rem;
  }
  
  .text-gray {
    color: var(--gray-500);
  }
  
  .expense-items {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .expense-item {
    padding: 1.25rem;
    position: relative;
  }
  
  .expense-content {
    position: relative;
  }
  
  .expense-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.75rem;
  }
  
  .expense-header h5 {
    margin: 0;
    font-size: 1.125rem;
  }
  
  .vendor {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0.25rem 0 0;
  }
  
  .expense-amount {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--gray-900);
  }
  
  .expense-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .category-badge {
    font-size: 0.75rem;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-weight: 500;
  }
  
  .date {
    font-size: 0.875rem;
    color: var(--gray-500);
  }
  
  .expense-notes {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin: 0.5rem 0 0;
  }
  
  .expense-actions {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .expense-item:hover .expense-actions {
    opacity: 1;
  }
  
  .icon-btn {
    background: none;
    padding: 0.25rem;
    font-size: 0.875rem;
    border-radius: var(--radius-sm);
    transition: background 0.2s;
  }
  
  .icon-btn:hover {
    background: var(--gray-100);
    transform: none;
    box-shadow: none;
  }
  
  .icon-btn.danger:hover {
    background: rgba(239, 68, 68, 0.1);
  }
  
  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .edit-row {
    display: flex;
    gap: 0.5rem;
  }
  
  .edit-row input,
  .edit-row textarea,
  .edit-row select {
    flex: 1;
    font-size: 0.875rem;
  }
  
  .edit-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
  
  button.small {
    padding: 0.25rem 0.75rem;
    font-size: 0.8125rem;
  }
  
  @media (max-width: 768px) {
    .summary-grid {
      grid-template-columns: 1fr 1fr;
    }
    
    .charts-grid {
      grid-template-columns: 1fr;
    }
    
    .form-row {
      flex-direction: column;
    }
    
    .edit-row {
      flex-direction: column;
    }
  }
</style>