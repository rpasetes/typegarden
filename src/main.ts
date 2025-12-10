import './style.css';
import { initTyping } from './typing.ts';
import { loadGarden, initGarden } from './garden.ts';
import { render } from './ui.ts';

// Initialize garden state (load from localStorage or create fresh)
const garden = loadGarden() ?? initGarden();

// Render initial UI
render(garden);

// Initialize typing engine
initTyping(garden);
