import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  onCloseModals?: () => void;
  onExportPdf?: () => void;
  onSaveChat?: () => void;
}

/**
 * Custom hook to handle global keyboard shortcuts for the Berno editorial interface:
 * - 'Ctrl + K' / 'Cmd + K': Start a new chat
 * - 'Ctrl + Shift + S' / 'Cmd + Shift + S': Toggle navigation sidebar
 * - 'Esc': Close any open dialogs / modals
 * - 'Ctrl + S' / 'Cmd + S': Save chat
 */
export function useKeyboardShortcuts({
  onNewChat,
  onToggleSidebar,
  onCloseModals,
  onExportPdf,
  onSaveChat,
}: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      // Escape: Close any open modals
      if (event.key === 'Escape') {
        if (onCloseModals) {
          event.preventDefault();
          onCloseModals();
        }
        return;
      }

      // Ctrl + Shift + S: Toggle the sidebar
      if (isCtrlOrCmd && event.shiftKey && (event.key === 'S' || event.key === 's')) {
        event.preventDefault();
        onToggleSidebar?.();
        return;
      }

      // Ctrl + K: New Chat
      if (isCtrlOrCmd && !event.shiftKey && !event.altKey && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        onNewChat?.();
        return;
      }

      // Ctrl + S (without Shift): Save active conversation to storage
      if (isCtrlOrCmd && !event.shiftKey && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        onSaveChat?.();
        return;
      }

      // Ctrl + P or Alt + P: Quick PDF export
      if (isCtrlOrCmd && event.altKey && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        onExportPdf?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNewChat, onToggleSidebar, onCloseModals, onExportPdf, onSaveChat]);
}
