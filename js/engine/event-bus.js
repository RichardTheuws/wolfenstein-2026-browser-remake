/**
 * event-bus.js — Simple pub/sub event system
 *
 * Singleton event bus for decoupled communication between game modules.
 * Events: 'player:interact', 'door:open', 'door:close', 'player:damage',
 *         'player:death', 'player:pickup', 'level:complete', 'game:pause', 'game:resume'
 */

class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function for convenience
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);

        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event, but only fire once.
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     */
    once(event, callback) {
        const wrapper = (data) => {
            this.off(event, wrapper);
            callback(data);
        };
        this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} event - Event name
     * @param {Function} callback - Handler function to remove
     */
    off(event, callback) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this._listeners.delete(event);
            }
        }
    }

    /**
     * Emit an event with optional data.
     * @param {string} event - Event name
     * @param {*} [data] - Data to pass to handlers
     */
    emit(event, data) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`[EventBus] Error in handler for '${event}':`, err);
                }
            }
        }
    }

    /**
     * Remove all listeners for a specific event, or all events if no event specified.
     * @param {string} [event] - Optional event name
     */
    clear(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }
}

/** Singleton instance */
export const eventBus = new EventBus();
