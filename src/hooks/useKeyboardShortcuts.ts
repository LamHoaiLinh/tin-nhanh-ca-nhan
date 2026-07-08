import { useEffect } from 'react';
interface ShortcutHandlers { previous?: () => void; next?: () => void; save?: () => void; read?: () => void; back?: () => void; }
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft') handlers.previous?.();
      if (event.key === 'ArrowRight') handlers.next?.();
      if (event.key.toLowerCase() === 's') handlers.save?.();
      if (event.key.toLowerCase() === 'r') handlers.read?.();
      if (event.key === 'Escape') handlers.back?.();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handlers]);
}
