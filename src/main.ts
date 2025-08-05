import './app.css'
import App from './App.svelte'

console.log('Main.ts is loading...');

let app;

try {
  app = new App({
    target: document.getElementById('app')!
  })
  console.log('App mounted successfully');
  
  // @ts-ignore
  window.app = app; // For debugging
} catch (error) {
  console.error('Failed to mount app:', error);
  document.getElementById('app')!.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>Error Loading App</h1>
      <pre>${error}</pre>
    </div>
  `;
}

export default app