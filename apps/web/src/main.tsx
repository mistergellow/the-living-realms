import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { installAppFeel } from './lib/app-feel';
import { installUiSounds } from './lib/audio';
import { queryClient } from './lib/query-client';
import '@fontsource/alegreya/400.css';
import '@fontsource/alegreya/400-italic.css';
import '@fontsource/alegreya/500.css';
import '@fontsource/alegreya/700.css';
import '@fontsource/alegreya-sc/500.css';
import '@fontsource/alegreya-sc/700.css';
import '@fontsource/grenze-gotisch/600.css';
import '@fontsource/grenze-gotisch/800.css';
// Request #84: the HUD face (high-contrast serif, Belle Époque feel).
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import './styles/global.css';
// Request #69: the gothic "Darkest" look (overrides the feature stylesheets).
import './styles/theme.css';
import './styles/game-feel.css'; // request #87, loaded last

installAppFeel();
installUiSounds(); // request #87: every control sounds like a game control

/*
 * Request #70: wait (briefly) for the game fonts before the first paint, so
 * text does not jump when they arrive. Never longer than 1.5 s.
 */
const FONTS = [
  '400 1em Alegreya',
  '700 1em Alegreya',
  '500 1em "Alegreya SC"',
  '700 1em "Alegreya SC"',
  '600 1em "Grenze Gotisch"',
  '800 1em "Grenze Gotisch"',
  '600 1em "Cormorant Garamond"',
  'italic 600 1em "Cormorant Garamond"',
];
void Promise.race([
  Promise.all(FONTS.map((f) => document.fonts.load(f))).catch(() => undefined),
  new Promise((r) => setTimeout(r, 1500)),
]).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
  // Request #87: the loading screen (index.html) fades out once the game is drawn.
  const boot = document.getElementById('boot');
  if (boot)
    requestAnimationFrame(() => {
      boot.classList.add('is-done');
      setTimeout(() => boot.remove(), 700);
    });
});
