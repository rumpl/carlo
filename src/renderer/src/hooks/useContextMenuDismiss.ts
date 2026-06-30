import { useEffect } from 'react';

/**
 * Attaches window-level listeners that call `onClose` when:
 * - any click occurs outside the menu,
 * - the window loses focus (blur), or
 * - the Escape key is pressed.
 *
 * Listeners are only registered while `isOpen` is `true`.
 */
export function useContextMenuDismiss(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const close = () => onClose();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);
}
