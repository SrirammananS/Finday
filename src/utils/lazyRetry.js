import React from 'react';

/**
 * A wrapper for React.lazy that retries the import if it fails.
 * This is useful for handling "Importing a module script failed" errors
 * that happen when a new version of the app is deployed and old chunks are removed.
 * 
 * @param {Function} componentImport - A function that returns a promise (e.g., () => import('./MyComponent'))
 * @returns {React.Component} A lazy-loaded component with retry logic
 */
export const lazyWithRetry = (componentImport) => {
  return React.lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.localStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      // Check if it's a module load error
      const isModuleError = 
        error.name === 'ChunkLoadError' || 
        error.message?.includes('Importing a module script failed') ||
        error.message?.includes('Failed to fetch dynamically imported module');

      if (isModuleError && !pageHasAlreadyBeenForceRefreshed) {
        // Log that we're forcing a refresh
        console.error('LAKSH: Lazy load failing due to missing module. Forcing full page reload...', error);
        window.localStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Return a promise that never resolves to prevent further errors while reloading
        return new Promise(() => {});
      }

      // If we already tried to reload once or it's not a module error, throw it
      throw error;
    }
  });
};

/**
 * A wrapper for dynamic import() that retries on failure.
 * 
 * @param {Function} moduleImport - A function that returns a promise (e.g., () => import('./myModule'))
 * @returns {Promise} The imported module
 */
export const importWithRetry = async (moduleImport) => {
  const pageHasAlreadyBeenForceRefreshed = JSON.parse(
    window.localStorage.getItem('page-has-been-force-refreshed') || 'false'
  );

  try {
    const module = await moduleImport();
    window.localStorage.setItem('page-has-been-force-refreshed', 'false');
    return module;
  } catch (error) {
    const isModuleError = 
      error.name === 'ChunkLoadError' || 
      error.message?.includes('Importing a module script failed') ||
      error.message?.includes('Failed to fetch dynamically imported module');

    if (isModuleError && !pageHasAlreadyBeenForceRefreshed) {
      console.error('LAKSH: Dynamic import failing. Forcing full page reload...', error);
      window.localStorage.setItem('page-has-been-force-refreshed', 'true');
      window.location.reload();
      return new Promise(() => {});
    }
    throw error;
  }
};
