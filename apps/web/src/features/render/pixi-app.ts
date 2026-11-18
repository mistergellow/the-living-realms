// Our Content-Security-Policy has no 'unsafe-eval': use Pixi's eval-free shader/uniform paths.
import 'pixi.js/unsafe-eval';
// Register the render pipes for everything our scenes draw (not all are on by default).
import 'pixi.js/graphics';
import 'pixi.js/text';
import 'pixi.js/text-bitmap';
import 'pixi.js/filters';
import { Application } from 'pixi.js';

/**
 * Creates a Pixi application whose canvas fills `host`. Loaded lazily (dynamic
 * import) so Pixi is only downloaded on the screens that use it.
 */
export async function createPixiApp(
  host: HTMLElement,
  width: number,
  height: number,
): Promise<Application> {
  const app = new Application();
  await app.init({
    width: Math.max(1, width),
    height: Math.max(1, height),
    antialias: true,
    backgroundAlpha: 0,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    preference: 'webgl',
  });
  app.canvas.classList.add('pixi-canvas');
  host.appendChild(app.canvas);
  return app;
}
