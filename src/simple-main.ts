import SimpleApp from './SimpleApp.svelte'

console.log('Simple main.ts loading...');

const app = new SimpleApp({
  target: document.getElementById('app')!
})

console.log('Simple app mounted');

export default app