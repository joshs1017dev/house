<script>
  let projectCount = 0;
  let showForm = false;
  let projects = [];
  
  function addProject() {
    const name = prompt("Enter project name:");
    if (name) {
      projects = [...projects, {
        id: Date.now(),
        name: name,
        status: 'active',
        budget: 1000
      }];
      projectCount = projects.length;
    }
  }
</script>

<div class="app">
  <nav class="navigation">
    <div class="nav-container">
      <div class="nav-brand">
        <span class="brand-icon">🏡</span>
        <span class="brand-text">House</span>
      </div>
      <button class="new-project-btn" on:click={addProject}>
        <span>➕</span>
        <span>New Project</span>
      </button>
    </div>
  </nav>
  
  <main class="main-content">
    <div class="container p-6">
      <h1>Home Improvement Manager</h1>
      <p>Welcome! This is a working version with Svelte 4.</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Active Projects</div>
          <div class="stat-value">{projectCount}</div>
        </div>
      </div>
      
      {#if projects.length > 0}
        <h2>Your Projects</h2>
        <div class="project-list">
          {#each projects as project}
            <div class="project-card card">
              <h3>{project.name}</h3>
              <p>Status: {project.status}</p>
              <p>Budget: ${project.budget}</p>
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty-state">No projects yet. Click "New Project" to get started!</p>
      {/if}
    </div>
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .navigation {
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
    justify-content: space-between;
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
  
  .new-project-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #10b981;
    color: white;
    padding: 0.5rem 1.25rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }
  
  .new-project-btn:hover {
    background: #059669;
  }
  
  .main-content {
    flex: 1;
    background: #f9fafb;
  }
  
  .container {
    max-width: 1280px;
    margin: 0 auto;
  }
  
  .p-6 {
    padding: 1.5rem;
  }
  
  h1 {
    font-size: 2.25rem;
    margin-bottom: 0.5rem;
  }
  
  h2 {
    font-size: 1.5rem;
    margin: 2rem 0 1rem;
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
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 600;
    color: #111827;
  }
  
  .project-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .project-card {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .project-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
  }
  
  .project-card p {
    margin: 0.25rem 0;
    color: #6b7280;
  }
  
  .empty-state {
    text-align: center;
    color: #6b7280;
    padding: 3rem 0;
  }
</style>