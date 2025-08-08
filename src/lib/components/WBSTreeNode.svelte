<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let node: any;
  export let depth: number = 0;
  export let expandedNodes: Set<string>;
  export let showWBSCode: boolean;
  
  const dispatch = createEventDispatcher();
  
  function toggleNode() {
    dispatch('toggle', node.id);
  }
  
  function getNodeIcon(type: string): string {
    switch (type) {
      case 'project': return '🏗️';
      case 'phase': return '📁';
      case 'task': return '📋';
      case 'subtask': return '📌';
      default: return '•';
    }
  }
  
  function getProgressColor(progress: number): string {
    if (progress >= 80) return '#10b981';
    if (progress >= 50) return '#3b82f6';
    if (progress >= 20) return '#f59e0b';
    return '#6b7280';
  }
</script>

<div class="tree-node" style="margin-left: {depth * 2}rem">
  <div class="node-content" on:click={toggleNode}>
    <span class="node-toggle">
      {#if node.children.length > 0}
        {expandedNodes.has(node.id) ? '▼' : '▶'}
      {:else}
        <span style="width: 1rem; display: inline-block;"></span>
      {/if}
    </span>
    
    <span class="node-icon">{getNodeIcon(node.type)}</span>
    
    {#if showWBSCode}
      <span class="node-code">{node.code}</span>
    {/if}
    
    <span class="node-name">{node.name}</span>
    
    <span class="node-info">
      {#if node.work}
        <span class="work-hours">{node.work}h</span>
      {/if}
      
      {#if node.progress !== undefined}
        <div class="mini-progress">
          <div 
            class="mini-progress-fill"
            style="width: {node.progress}%; background: {getProgressColor(node.progress)}"
          ></div>
        </div>
        <span class="progress-text">{node.progress}%</span>
      {/if}
    </span>
  </div>
  
  {#if node.children.length > 0 && expandedNodes.has(node.id)}
    {#each node.children as child}
      <svelte:self 
        node={child} 
        depth={depth + 1} 
        {expandedNodes} 
        {showWBSCode}
        on:toggle
      />
    {/each}
  {/if}
</div>

<style>
  .tree-node {
    margin-bottom: 0.25rem;
  }
  
  .node-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .node-content:hover {
    background: #f3f4f6;
  }
  
  .node-toggle {
    width: 1rem;
    color: #6b7280;
  }
  
  .node-icon {
    font-size: 1.125rem;
  }
  
  .node-code {
    font-weight: 600;
    color: #3b82f6;
    font-family: monospace;
  }
  
  .node-name {
    flex: 1;
    font-weight: 500;
  }
  
  .node-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .work-hours {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .mini-progress {
    width: 60px;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .mini-progress-fill {
    height: 100%;
    transition: width 0.3s;
  }
  
  .progress-text {
    font-size: 0.875rem;
    font-weight: 600;
  }
</style>