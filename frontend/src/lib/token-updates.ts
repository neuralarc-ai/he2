/**
 * Utility functions for triggering token usage updates
 * These functions dispatch custom events that the navigation component listens to
 */

export const triggerTokenUpdate = {
  /**
   * Call this when an agent completes a response
   * This will trigger a token usage refresh in the navigation
   */
  onAgentComplete: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agent-complete', {
        detail: { timestamp: new Date().toISOString() }
      }));
    }
  },

  /**
   * Call this when a user sends a message
   * This will trigger a token usage refresh in the navigation
   */
  onMessageSent: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('message-sent', {
        detail: { timestamp: new Date().toISOString() }
      }));
    }
  },

  /**
   * Call this when you want to force a token usage refresh
   * This will trigger an immediate refresh in the navigation
   */
  forceRefresh: () => {
    if (typeof window !== 'undefined' && (window as any).dispatchTokenUpdateEvent) {
      (window as any).dispatchTokenUpdateEvent('agent-complete');
    }
  }
};

/**
 * Hook for components that want to trigger token updates
 */
export const useTokenUpdates = () => {
  return triggerTokenUpdate;
};


