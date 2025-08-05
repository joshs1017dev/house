<script>
  let message = "House App is Loading...";
  let error = "";
  
  try {
    message = "🏠 House - Home Improvement Manager";
  } catch (e) {
    error = e.toString();
  }
</script>

<div class="container">
  <h1>{message}</h1>
  {#if error}
    <p style="color: red;">Error: {error}</p>
  {:else}
    <p>✓ Svelte is working!</p>
    <p>The full app will load here once we fix the TypeScript issues.</p>
    <button on:click={() => alert('Button works!')}>Test Button</button>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: sans-serif;
  }
  
  h1 {
    color: #2563eb;
  }
  
  button {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  
  button:hover {
    background: #1d4ed8;
  }
</style>