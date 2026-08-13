/**
 * Utility for dynamic case conversions and dual-casing objects across Enterprise CRM modules.
 * Ensures seamless compatibility between Database (snake_case) and API/Frontend (camelCase).
 */

function camelToSnakeCase(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function snakeToCamelCase(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Dynamically converts and attaches both camelCase and snake_case property aliases
 * for any given object without hardcoding property names.
 *
 * @param {Object} item - Plain object or Mongoose document.
 * @returns {Object} New object containing dual-cased property keys.
 */
function withDualCase(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;

  const obj = item.toObject ? item.toObject({ virtuals: true, getters: true }) : { ...item };
  const result = { ...obj };

  for (const key of Object.keys(obj)) {
    if (key.startsWith('_')) continue; // Skip MongoDB internal keys like _id, __v

    const val = obj[key];

    // If key has camelCase uppercase letters, generate snake_case alias if not present
    if (/[A-Z]/.test(key)) {
      const snakeKey = camelToSnakeCase(key);
      if (result[snakeKey] === undefined) {
        result[snakeKey] = val;
      }
    }

    // If key contains underscores, generate camelCase alias if not present
    if (key.includes('_')) {
      const camelKey = snakeToCamelCase(key);
      if (result[camelKey] === undefined) {
        result[camelKey] = val;
      }
    }
  }

  return result;
}

/**
 * Maps an array of items to dual-cased objects.
 */
function mapWithDualCase(items) {
  if (!Array.isArray(items)) return [];
  return items.map(withDualCase);
}

module.exports = {
  camelToSnakeCase,
  snakeToCamelCase,
  withDualCase,
  mapWithDualCase,
};
