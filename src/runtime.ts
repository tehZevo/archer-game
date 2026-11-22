// The single DOM boundary. Everything that touches the browser goes through
// here, so the game logic can run headless (node) with stub implementations.

export interface Runtime {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  log(html: string): void;
}

const isBrowser = typeof document !== 'undefined';

function create(): Runtime {
  if (isBrowser) {
    const canvas = document.getElementById('c') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    return {
      canvas,
      ctx,
      log(html: string) {
        const el = document.getElementById('log');
        if (!el) return;
        const d = document.createElement('div');
        d.innerHTML = html;
        el.prepend(d);
        while (el.children.length > 7) el.lastChild?.remove();
      },
    };
  }

  // Headless defaults: a canvas-less runtime so logic-only tests can import
  // the whole module graph without a DOM.
  return { canvas: null, ctx: null, log() {} };
}

export const runtime: Runtime = create();
