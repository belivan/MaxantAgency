/**
 * File Watcher - Monitor agent directories for changes
 *
 * Watches all agent directories and triggers re-validation on file changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileWatcher {
  constructor(agentDirs, callback) {
    this.agentDirs = agentDirs;
    this.callback = callback;
    this.watchers = [];
    this.debounceTimers = new Map();
    this.DEBOUNCE_DELAY = 1000; // 1 second
  }

  /**
   * Start watching all agent directories
   */
  start() {
    logger.info('🔍 Starting Watch Mode...');
    console.log('');

    for (const [agentName, dir] of Object.entries(this.agentDirs)) {
      if (fs.existsSync(dir)) {
        try {
          const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
            if (filename && this.shouldWatch(filename)) {
              this.handleFileChange(agentName, filename, eventType);
            }
          });

          this.watchers.push(watcher);
          logger.success(`Watching ${agentName}: ${dir}`);
        } catch (error) {
          logger.warning(`Could not watch ${agentName}: ${error.message}`);
        }
      } else {
        logger.warning(`Directory not found: ${dir}`);
      }
    }

    console.log('');
    logger.info('👀 Watching for changes... (Press Ctrl+C to stop)');
    console.log('');
  }

  /**
   * Check if file should trigger a watch event
   */
  shouldWatch(filename) {
    // Watch .js and .json files
    if (filename.endsWith('.js') || filename.endsWith('.json')) {
      // Skip node_modules, .next, and other build artifacts
      if (filename.includes('node_modules') ||
          filename.includes('.next') ||
          filename.includes('dist') ||
          filename.includes('build') ||
          filename.includes('.git')) {
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Handle file change with debouncing
   */
  handleFileChange(agentName, filename, eventType) {
    const key = `${agentName}:${filename}`;

    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    // Set new timer
    const timer = setTimeout(() => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('');
      logger.info(`[${timestamp}] File changed: ${agentName}/${filename}`);

      // Trigger callback
      this.callback(agentName, filename, eventType);

      this.debounceTimers.delete(key);
    }, this.DEBOUNCE_DELAY);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Stop watching
   */
  stop() {
    console.log('');
    logger.info('Stopping watch mode...');

    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close all watchers
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    logger.success('Watch mode stopped');
  }
}

export default FileWatcher;
