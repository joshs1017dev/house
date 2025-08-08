<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let currentView: string;
  export let isOpen: boolean = false;
  
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
    isOpen = false;
  }
  
  function newProject() {
    dispatch('newProject');
    isOpen = false;
  }
  
  function toggleMenu() {
    isOpen = !isOpen;
  }
</script>

<!-- Mobile Header -->
<header class="mobile-header">
  <button class="menu-toggle" on:click={toggleMenu} aria-label="Toggle menu">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      {#if isOpen}
        <path d="M6 18L18 6M6 6l12 12" />
      {:else}
        <path d="M3 12h18M3 6h18M3 18h18" />
      {/if}
    </svg>
  </button>
  
  <div class="header-title">
    <span class="logo-icon">🏗️</span>
    <span>CONSTRUCT</span>
  </div>
  
  <button class="new-project-mobile" on:click={newProject} aria-label="New project">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  </button>
</header>

<!-- Mobile Navigation Drawer -->
{#if isOpen}
  <div class="mobile-overlay" on:click={() => isOpen = false}></div>
{/if}

<nav class="mobile-nav" class:open={isOpen}>
  <div class="nav-header">
    <h2>Navigation</h2>
    <button class="close-btn" on:click={() => isOpen = false} aria-label="Close menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
  
  <div class="nav-content">
    <button class="new-project-btn" on:click={newProject}>
      <span>➕</span>
      New Project
    </button>
    
    {#each navSections as section}
      <div class="nav-section">
        <h3>{section.title}</h3>
        <div class="nav-items">
          {#each section.items as item}
            <button
              class="nav-item"
              class:active={currentView === item.id}
              on:click={() => navigate(item.id)}
            >
              <span class="nav-icon">{item.icon}</span>
              <span class="nav-label">{item.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  
  <div class="nav-footer">
    <div class="user-info">
      <span class="user-avatar">👤</span>
      <div class="user-details">
        <span class="user-name">Project Manager</span>
        <span class="user-role">Administrator</span>
      </div>
    </div>
  </div>
</nav>

<style>
  .mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: #1a1f2e;
    color: white;
    padding: 0 1rem;
    align-items: center;
    justify-content: space-between;
    z-index: 1100;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .menu-toggle,
  .new-project-mobile,
  .close-btn {
    background: none;
    border: none;
    color: white;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: background 0.2s;
  }
  
  .menu-toggle:hover,
  .new-project-mobile:hover,
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.125rem;
  }
  
  .logo-icon {
    font-size: 1.5rem;
  }
  
  .mobile-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1200;
  }
  
  .mobile-nav {
    position: fixed;
    top: 0;
    left: -100%;
    bottom: 0;
    width: 80%;
    max-width: 320px;
    background: #1a1f2e;
    color: #e2e8f0;
    z-index: 1300;
    transition: left 0.3s ease;
    display: none;
    flex-direction: column;
    overflow-y: auto;
  }
  
  .mobile-nav.open {
    left: 0;
  }
  
  .nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #2d3748;
  }
  
  .nav-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .nav-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
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
    margin-bottom: 1.5rem;
  }
  
  .nav-section {
    margin-bottom: 1.5rem;
  }
  
  .nav-section h3 {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #718096;
    margin: 0 0 0.75rem 0;
  }
  
  .nav-items {
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
    text-align: left;
    width: 100%;
    transition: all 0.2s;
  }
  
  .nav-item:hover {
    background: #2d3748;
    color: white;
  }
  
  .nav-item.active {
    background: #3b82f6;
    color: white;
  }
  
  .nav-icon {
    font-size: 1.25rem;
  }
  
  .nav-label {
    font-size: 0.95rem;
  }
  
  .nav-footer {
    padding: 1rem;
    border-top: 1px solid #2d3748;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .user-avatar {
    font-size: 1.5rem;
  }
  
  .user-name {
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .user-role {
    font-size: 0.75rem;
    color: #718096;
  }
  
  /* Show mobile navigation on small screens */
  @media (max-width: 768px) {
    .mobile-header {
      display: flex;
    }
    
    .mobile-overlay {
      display: block;
    }
    
    .mobile-nav {
      display: flex;
    }
  }
  
  /* Ensure good touch targets */
  @media (pointer: coarse) {
    .menu-toggle,
    .new-project-mobile,
    .close-btn,
    .nav-item {
      min-height: 44px;
      min-width: 44px;
    }
  }
</style>