<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let currentView: string;
  
  const dispatch = createEventDispatcher();
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'projects', label: 'Projects', icon: '🔨' },
    { id: 'tools', label: 'Tools', icon: '🧰' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' }
  ];
  
  function navigate(view: string) {
    dispatch('navigate', view);
  }
  
  function newProject() {
    dispatch('newProject');
  }
</script>

<nav class="navigation">
  <div class="nav-container">
    <div class="nav-brand">
      <span class="brand-icon">🏡</span>
      <span class="brand-text">House</span>
    </div>
    
    <div class="nav-items">
      {#each navItems as item}
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
    
    <button class="new-project-btn" on:click={newProject}>
      <span>➕</span>
      <span>New Project</span>
    </button>
  </div>
</nav>

<style>
  .navigation {
    background: white;
    box-shadow: var(--shadow);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .nav-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    height: 4rem;
  }
  
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 1.25rem;
  }
  
  .brand-icon {
    font-size: 1.5rem;
  }
  
  .nav-items {
    display: flex;
    gap: 0.5rem;
    flex: 1;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    color: var(--gray-600);
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }
  
  .nav-item:hover {
    background: var(--gray-100);
    color: var(--gray-900);
    transform: none;
    box-shadow: none;
  }
  
  .nav-item.active {
    background: var(--primary);
    color: white;
  }
  
  .nav-icon {
    font-size: 1.125rem;
  }
  
  .new-project-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--secondary);
    color: white;
    padding: 0.5rem 1.25rem;
  }
  
  .new-project-btn:hover {
    background: #059669;
  }
  
  @media (max-width: 768px) {
    .nav-container {
      padding: 0 0.75rem;
      gap: 1rem;
    }
    
    .nav-label {
      display: none;
    }
    
    .brand-text {
      display: none;
    }
    
    .new-project-btn span:last-child {
      display: none;
    }
  }
</style>