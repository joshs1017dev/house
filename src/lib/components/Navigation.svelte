<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let currentView: string;
  
  const dispatch = createEventDispatcher();
  
  const navSections = [
    {
      title: 'Project Management',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'projects', label: 'Projects', icon: '🏗️' },
        { id: 'schedule', label: 'Master Schedule', icon: '📅' },
        { id: 'scheduling', label: 'Advanced Scheduling', icon: '⚡' },
        { id: 'wbs', label: 'Work Breakdown', icon: '🗂️' }
      ]
    },
    {
      title: 'Field Operations',
      items: [
        { id: 'dailylog', label: 'Daily Reports', icon: '📝' },
        { id: 'workforce', label: 'Workforce', icon: '👷' },
        { id: 'equipment', label: 'Equipment', icon: '🚜' },
        { id: 'safety', label: 'Safety', icon: '⚠️' }
      ]
    },
    {
      title: 'Documentation',
      items: [
        { id: 'submittals', label: 'Submittals', icon: '📋' },
        { id: 'rfis', label: 'RFIs', icon: '❓' },
        { id: 'drawings', label: 'Drawings', icon: '📐' },
        { id: 'specs', label: 'Specifications', icon: '📄' }
      ]
    },
    {
      title: 'Financial',
      items: [
        { id: 'budget', label: 'Budget', icon: '💰' },
        { id: 'changeorders', label: 'Change Orders', icon: '🔄' },
        { id: 'invoices', label: 'Invoices', icon: '🧾' },
        { id: 'payapps', label: 'Pay Applications', icon: '💳' }
      ]
    }
  ];
  
  function navigate(view: string) {
    dispatch('navigate', view);
  }
  
  function newProject() {
    dispatch('newProject');
  }
  
  let collapsed = false;
</script>

<aside class="sidebar" class:collapsed>
  <div class="sidebar-header">
    <div class="logo">
      {#if !collapsed}
        <span class="logo-icon">🏗️</span>
        <div class="logo-text">
          <h1>CONSTRUCT</h1>
          <span class="tagline">Professional Edition</span>
        </div>
      {:else}
        <span class="logo-icon-small">🏗️</span>
      {/if}
    </div>
    <button class="toggle-btn" on:click={() => collapsed = !collapsed}>
      <svg width="20" height="20" viewBox="0 0 20 20">
        {#if collapsed}
          <polyline points="7 4 13 10 7 16" stroke="currentColor" stroke-width="2" fill="none"/>
        {:else}
          <polyline points="13 4 7 10 13 16" stroke="currentColor" stroke-width="2" fill="none"/>
        {/if}
      </svg>
    </button>
  </div>
  
  <div class="sidebar-content">
    <button class="new-project-btn" on:click={newProject}>
      <span class="btn-icon">➕</span>
      {#if !collapsed}
        <span>New Project</span>
      {/if}
    </button>
    
    <nav class="nav-sections">
      {#each navSections as section}
        <div class="nav-section">
          {#if !collapsed}
            <h3 class="section-title">{section.title}</h3>
          {/if}
          <div class="section-items">
            {#each section.items as item}
              <button
                class="nav-item"
                class:active={currentView === item.id}
                on:click={() => navigate(item.id)}
                title={collapsed ? item.label : ''}
              >
                <span class="nav-icon">{item.icon}</span>
                {#if !collapsed}
                  <span class="nav-label">{item.label}</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </nav>
  </div>
  
  <div class="sidebar-footer">
    <div class="user-info">
      <span class="user-avatar">👤</span>
      {#if !collapsed}
        <div class="user-details">
          <span class="user-name">Project Manager</span>
          <span class="user-role">Administrator</span>
        </div>
      {/if}
    </div>
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    background: #1a1f2e;
    color: #e2e8f0;
    display: flex;
    flex-direction: column;
    transition: width 0.3s ease;
    z-index: 1000;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  }
  
  .sidebar.collapsed {
    width: 70px;
  }
  
  .sidebar-header {
    padding: 1.5rem 1rem;
    border-bottom: 1px solid #2d3748;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .logo-icon {
    font-size: 2rem;
  }
  
  .logo-icon-small {
    font-size: 1.5rem;
  }
  
  .logo-text h1 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: 0.05em;
  }
  
  .tagline {
    font-size: 0.75rem;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
  .toggle-btn {
    background: none;
    border: none;
    color: #718096;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }
  
  .toggle-btn:hover {
    background: #2d3748;
    color: #e2e8f0;
  }
  
  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }
  
  .new-project-btn {
    width: 100%;
    background: #10b981;
    color: white;
    border: none;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 2rem;
  }
  
  .new-project-btn:hover {
    background: #059669;
    transform: translateY(-1px);
  }
  
  .btn-icon {
    font-size: 1.25rem;
  }
  
  .nav-sections {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .section-title {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #718096;
    margin: 0 0 0.75rem 0.5rem;
    font-weight: 600;
  }
  
  .section-items {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .nav-item {
    background: none;
    border: none;
    color: #cbd5e0;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
    position: relative;
  }
  
  .nav-item:hover {
    background: #2d3748;
    color: white;
    transform: translateX(2px);
  }
  
  .nav-item.active {
    background: #3b82f6;
    color: white;
  }
  
  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 70%;
    background: white;
    border-radius: 0 2px 2px 0;
  }
  
  .nav-icon {
    font-size: 1.25rem;
    min-width: 1.25rem;
  }
  
  .nav-label {
    font-size: 0.95rem;
    font-weight: 500;
  }
  
  .sidebar-footer {
    padding: 1.5rem 1rem;
    border-top: 1px solid #2d3748;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .user-avatar {
    font-size: 1.5rem;
    min-width: 1.5rem;
  }
  
  .user-details {
    display: flex;
    flex-direction: column;
  }
  
  .user-name {
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .user-role {
    font-size: 0.75rem;
    color: #718096;
  }
  
  /* Scrollbar styling */
  .sidebar-content::-webkit-scrollbar {
    width: 6px;
  }
  
  .sidebar-content::-webkit-scrollbar-track {
    background: #2d3748;
  }
  
  .sidebar-content::-webkit-scrollbar-thumb {
    background: #4a5568;
    border-radius: 3px;
  }
  
  .sidebar-content::-webkit-scrollbar-thumb:hover {
    background: #718096;
  }
  
  @media (max-width: 768px) {
    .sidebar {
      width: 70px;
    }
    
    .sidebar:not(.collapsed) {
      width: 100%;
    }
  }
</style>