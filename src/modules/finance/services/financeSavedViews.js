/**
 * financeSavedViews.js
 * Simple localStorage persistence for saved filter views.
 */

const STORAGE_KEY = 'finance_saved_views';
const MAX_VIEWS = 10;

/**
 * Get all saved views from localStorage.
 * @returns {Array<{id: string, name: string, filters: {type: string, category: string}}>}
 */
export function getSavedViews() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a new view or update existing one.
 * Enforces max limit and duplicate name check.
 * @param {{ name: string, filters: { type: string, category: string } }} view
 * @returns {boolean} success
 */
export function saveView({ name, filters }) {
  if (!name.trim()) return false;

  const views = getSavedViews();

  // Duplicate check
  if (views.some(v => v.name === name.trim())) return false;

  // Limit check
  if (views.length >= MAX_VIEWS) return false;

  views.push({
    id: `view-${Date.now()}`,
    name: name.trim(),
    filters: { ...filters },
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  return true;
}

/**
 * Delete a saved view by id.
 * @param {string} id
 * @returns {boolean} success
 */
export function deleteView(id) {
  const views = getSavedViews();
  const filtered = views.filter(v => v.id !== id);
  if (filtered.length === views.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}