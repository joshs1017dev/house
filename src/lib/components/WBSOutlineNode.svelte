<script lang="ts">
  export let node: any;
  export let indent: number = 0;
  export let showWBSCode: boolean;
</script>

<div class="outline-node" style="margin-left: {indent * 2}rem">
  <div class="outline-header">
    {#if showWBSCode}
      <span class="node-code">{node.code}</span>
    {/if}
    <span class="node-name">{node.name}</span>
  </div>
  
  <div class="outline-details">
    <span>Type: {node.type}</span>
    {#if node.work}
      <span>Work: {node.work} hours</span>
    {/if}
    {#if node.resources && node.resources.length > 0}
      <span>Resources: {node.resources.join(', ')}</span>
    {/if}
    {#if node.progress !== undefined}
      <span>Progress: {node.progress}%</span>
    {/if}
  </div>
  
  {#each node.children as child}
    <svelte:self node={child} indent={indent + 1} {showWBSCode} />
  {/each}
</div>

<style>
  .outline-node {
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }
  
  .outline-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .outline-header .node-code {
    font-weight: 600;
    color: #3b82f6;
  }
  
  .outline-header .node-name {
    font-weight: 600;
    font-size: 1.125rem;
  }
  
  .outline-details {
    display: flex;
    gap: 2rem;
    font-size: 0.875rem;
    color: #6b7280;
  }
</style>