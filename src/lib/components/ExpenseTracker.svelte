<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { db } from '../db/database';
  import type { Expense, Material } from '../db/database';
  import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
  import Chart from 'chart.js/auto';
  
  export let projectId: number;
  
  const dispatch = createEventDispatcher();
  
  let expenses: Expense[] = [];
  let materials: Material[] = [];
  let showNewExpenseForm = false;
  let chartCanvas: HTMLCanvasElement;
  let chart: Chart;
  let viewMode: 'list' | 'chart' = 'list';
  let filterCategory: 'all' | Expense['category'] = 'all';
  
  let newExpense = {
    category: 'materials' as Expense['category'],
    amount: 0,
    description: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    materialId: undefined as number | undefined
  };
  
  $: filteredExpenses = expenses.filter(e => 
    filterCategory === 'all' || e.category === filterCategory
  );
  
  $: totalByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
  
  $: totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  onMount(async () => {
    await loadExpenses();
    await loadMaterials();
  });
  
  async function loadExpenses() {
    expenses = await db.expenses
      .where('projectId')
      .equals(projectId)
      .reverse()
      .toArray();
    
    if (viewMode === 'chart' && expenses.length > 0) {
      updateChart();
    }
  }
  
  async function loadMaterials() {
    materials = await db.materials.where('projectId').equals(projectId).toArray();
  }
  
  async function addExpense() {
    if (!newExpense.description.trim() || newExpense.amount <= 0) {
      alert('Please enter a description and valid amount');
      return;
    }
    
    await db.expenses.add({
      projectId,
      category: newExpense.category,
      amount: newExpense.amount,
      description: newExpense.description.trim(),
      vendor: newExpense.vendor.trim() || undefined,
      date: new Date(newExpense.date),
      materialId: newExpense.materialId || undefined
    });
    
    // Update material actual cost if linked
    if (newExpense.materialId && newExpense.category === 'materials') {
      const material = materials.find(m => m.id === newExpense.materialId);
      if (material) {
        await db.materials.update(newExpense.materialId, {
          actualCost: (material.actualCost || 0) + newExpense.amount
        });
      }
    }
    
    newExpense = {
      category: 'materials',
      amount: 0,
      description: '',
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      materialId: undefined
    };
    
    showNewExpenseForm = false;
    await loadExpenses();
    dispatch('update');
  }
  
  async function deleteExpense(expense: Expense) {
    if (confirm('Are you sure you want to delete this expense?')) {
      await db.expenses.delete(expense.id!);
      
      // Update material actual cost if linked
      if (expense.materialId && expense.category === 'materials') {
        const material = await db.materials.get(expense.materialId);
        if (material) {
          await db.materials.update(expense.materialId, {
            actualCost: Math.max(0, (material.actualCost || 0) - expense.amount)
          });
        }
      }
      
      await loadExpenses();
      dispatch('update');
    }
  }
  
  function updateChart() {
    if (!chartCanvas) return;
    
    if (chart) {
      chart.destroy();
    }
    
    // Prepare monthly data
    const monthlyData = new Map<string, number>();
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const key = format(date, 'MMM yyyy');
      monthlyData.set(key, 0);
    }
    
    expenses.forEach(expense => {
      const key = format(expense.date, 'MMM yyyy');
      if (monthlyData.has(key)) {
        monthlyData.set(key, monthlyData.get(key)! + expense.amount);
      }
    });
    
    chart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: Array.from(monthlyData.keys()),
        datasets: [{
          label: 'Monthly Expenses',
          data: Array.from(monthlyData.values()),
          backgroundColor: 'rgba(37, 99, 235, 0.6)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value;
              }
            }
          }
        }
      }
    });
  }
  
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  function getCategoryIcon(category: Expense['category']) {
    switch (category) {
      case 'materials': return '🛒';
      case 'labor': return '👷';
      case 'permits': return '📋';
      case 'tools': return '🔨';
      case 'other': return '📌';
    }
  }
  
  $: if (viewMode === 'chart' && chartCanvas && expenses.length > 0) {
    updateChart();
  }
</script>

<div class="expense-tracker">
  <div class="expense-header">
    <h3>Expense Tracker</h3>
    <div class="header-actions">
      <div class="view-toggle">
        <button 
          class:active={viewMode === 'list'}
          on:click={() => viewMode = 'list'}
        >
          List
        </button>
        <button 
          class:active={viewMode === 'chart'}
          on:click={() => viewMode = 'chart'}
        >
          Chart
        </button>
      </div>
      <button on:click={() => showNewExpenseForm = true}>
        ➕ Add Expense
      </button>
    </div>
  </div>
  
  <div class="expense-summary">
    <div class="summary-total">
      <span class="label">Total Expenses:</span>
      <span class="value">{formatCurrency(totalExpenses)}</span>
    </div>
    <div class="category-breakdown">
      {#each Object.entries(totalByCategory) as [category, amount]}
        <div class="category-item">
          <span>{getCategoryIcon(category)} {category}:</span>
          <span>{formatCurrency(amount)}</span>
        </div>
      {/each}
    </div>
  </div>
  
  {#if showNewExpenseForm}
    <div class="new-expense-form card">
      <h4>Add New Expense</h4>
      <form on:submit|preventDefault={addExpense}>
        <div class="form-row">
          <div class="form-group">
            <label for="category">Category</label>
            <select id="category" bind:value={newExpense.category}>
              <option value="materials">Materials</option>
              <option value="labor">Labor</option>
              <option value="permits">Permits</option>
              <option value="tools">Tools</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="amount">Amount ($)</label>
            <input
              id="amount"
              type="number"
              bind:value={newExpense.amount}
              min="0.01"
              step="0.01"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="date">Date</label>
            <input
              id="date"
              type="date"
              bind:value={newExpense.date}
              required
            />
          </div>
        </div>
        
        {#if newExpense.category === 'materials' && materials.length > 0}
          <div class="form-group">
            <label for="material">Link to Material (optional)</label>
            <select id="material" bind:value={newExpense.materialId}>
              <option value={undefined}>No material link</option>
              {#each materials as material}
                <option value={material.id}>
                  {material.name} ({material.quantity} {material.unit})
                </option>
              {/each}
            </select>
          </div>
        {/if}
        
        <div class="form-group">
          <label for="description">Description</label>
          <input
            id="description"
            type="text"
            bind:value={newExpense.description}
            placeholder="What was this expense for?"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="vendor">Vendor (optional)</label>
          <input
            id="vendor"
            type="text"
            bind:value={newExpense.vendor}
            placeholder="Where did you buy it?"
          />
        </div>
        
        <div class="form-actions">
          <button type="button" class="secondary" on:click={() => showNewExpenseForm = false}>
            Cancel
          </button>
          <button type="submit">
            Add Expense
          </button>
        </div>
      </form>
    </div>
  {/if}
  
  {#if viewMode === 'list'}
    <div class="filter-bar">
      <label>Filter by category:</label>
      <select bind:value={filterCategory}>
        <option value="all">All Categories</option>
        <option value="materials">Materials</option>
        <option value="labor">Labor</option>
        <option value="permits">Permits</option>
        <option value="tools">Tools</option>
        <option value="other">Other</option>
      </select>
    </div>
    
    {#if filteredExpenses.length === 0}
      <div class="empty-state">
        <p>No expenses recorded yet</p>
        <p class="text-sm text-gray">Track your project spending by adding expenses</p>
      </div>
    {:else}
      <div class="expense-list">
        {#each filteredExpenses as expense}
          <div class="expense-item">
            <div class="expense-icon">
              {getCategoryIcon(expense.category)}
            </div>
            <div class="expense-details">
              <div class="expense-description">{expense.description}</div>
              <div class="expense-meta">
                <span>{expense.category}</span>
                {#if expense.vendor}
                  <span>• {expense.vendor}</span>
                {/if}
                <span>• {format(expense.date, 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div class="expense-amount">
              {formatCurrency(expense.amount)}
            </div>
            <button 
              class="icon-btn danger"
              on:click={() => deleteExpense(expense)}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="chart-container">
      <canvas bind:this={chartCanvas}></canvas>
    </div>
  {/if}
</div>

<style>
  .expense-tracker {
    height: 100%;
  }
  
  .expense-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .expense-header h3 {
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  
  .view-toggle {
    display: flex;
    background: var(--gray-100);
    border-radius: var(--radius-sm);
    padding: 0.125rem;
  }
  
  .view-toggle button {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    background: transparent;
    color: var(--gray-600);
  }
  
  .view-toggle button:hover {
    background: var(--gray-200);
    transform: none;
    box-shadow: none;
  }
  
  .view-toggle button.active {
    background: white;
    color: var(--gray-900);
    box-shadow: var(--shadow-sm);
  }
  
  .expense-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius-sm);
  }
  
  .summary-total {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .summary-total .label {
    font-size: 1rem;
    color: var(--gray-700);
  }
  
  .summary-total .value {
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .category-breakdown {
    display: flex;
    gap: 1.5rem;
    font-size: 0.875rem;
  }
  
  .category-item {
    display: flex;
    gap: 0.5rem;
    color: var(--gray-600);
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
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    color: var(--gray-700);
    font-weight: 500;
  }
  
  .form-group input,
  .form-group select {
    width: 100%;
  }
  
  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
  
  .filter-bar label {
    color: var(--gray-600);
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--gray-600);
  }
  
  .expense-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .expense-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--gray-50);
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }
  
  .expense-item:hover {
    background: white;
    box-shadow: var(--shadow-sm);
  }
  
  .expense-icon {
    font-size: 1.5rem;
  }
  
  .expense-details {
    flex: 1;
  }
  
  .expense-description {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }
  
  .expense-meta {
    font-size: 0.75rem;
    color: var(--gray-600);
  }
  
  .expense-amount {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--danger);
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
    background: rgb(239 68 68 / 0.1);
  }
  
  .chart-container {
    height: 400px;
    position: relative;
  }
  
  @media (max-width: 768px) {
    .expense-summary {
      flex-direction: column;
      gap: 1rem;
      align-items: start;
    }
    
    .category-breakdown {
      flex-wrap: wrap;
    }
    
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>