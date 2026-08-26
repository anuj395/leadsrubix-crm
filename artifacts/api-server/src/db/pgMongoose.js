const pg = require('pg');
const path = require('path');
const fs = require('fs');

// Ensure environment is loaded
if (!process.env.DATABASE_URL) {
  const currentEnv = process.env.NODE_ENV || 'development';
  const candidates = [
    path.resolve(__dirname, `../../.env.${currentEnv}`),
    path.resolve(__dirname, `../../.env`),
    path.resolve(__dirname, `../../../.env.${currentEnv}`),
    path.resolve(__dirname, `../../../.env`),
  ];
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      require('dotenv').config({ path: f });
      break;
    }
  }
}

function getPoolConfig() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/leadsrubix_crm';
  try {
    const url = new URL(dbUrl);
    return {
      user: url.username || 'postgres',
      password: url.password || 'postgres',
      host: url.hostname || 'localhost',
      port: parseInt(url.port || '5432', 10),
      database: (url.pathname || '/leadsrubix_crm').replace(/^\//, '') || 'leadsrubix_crm',
    };
  } catch (e) {
    return {
      user: 'postgres',
      password: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'leadsrubix_crm',
    };
  }
}

const pool = new pg.Pool(getPoolConfig());

const models = {};

// Simple implementation of mongoose Types.ObjectId
class ObjectId {
  constructor(id) {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0').slice(-8);
    const rand = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(16, '0').slice(-16);
    this.str = id ? String(id) : (timestamp + rand);
  }
  toString() {
    return this.str;
  }
  toJSON() {
    return this.str;
  }
  toPostgres() {
    return this.str;
  }
}
ObjectId.isValid = function (val) {
  if (!val) return false;
  const str = String(val);
  return /^[0-9a-fA-F]{24}$/.test(str) || /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
};

// Schema implementation
class Schema {
  constructor(definition = {}, options = {}) {
    this.definition = definition;
    this.paths = definition;
    this.options = options;
    this.virtuals = {};
    this.preHooks = { save: [] };
    this.methods = {};
    this.statics = {};
    this.tree = definition;
  }
  plugin(fn) {
    if (typeof fn === 'function') fn(this);
    return this;
  }
  pre(hookName, fn) {
    if (!this.preHooks[hookName]) this.preHooks[hookName] = [];
    this.preHooks[hookName].push(fn);
    return this;
  }
  virtual(name) {
    if (!this.virtuals[name]) {
      this.virtuals[name] = { get: null, set: null };
    }
    const self = this;
    return {
      get(fn) {
        self.virtuals[name].get = fn;
        return this;
      },
      set(fn) {
        self.virtuals[name].set = fn;
        return this;
      }
    };
  }
  index(fields, options = {}) {
    if (!this.indexesList) this.indexesList = [];
    this.indexesList.push({ fields, options });
  }
}
Schema.Types = {
  ObjectId: ObjectId,
  Mixed: 'Mixed',
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  Buffer: Buffer,
  Array: Array
};

function toQueryLike(execFn) {
  const obj = {
    exec: execFn,
    then: (onfulfilled, onrejected) => execFn().then(onfulfilled, onrejected),
    select: () => obj,
    lean: () => obj,
    sort: () => obj,
    populate: () => obj,
    skip: () => obj,
    limit: () => obj
  };
  return obj;
}

function normalizeQueryFilter(filter, schema) {
  if (!filter || typeof filter !== 'object' || !schema) {
    return filter;
  }
  const definition = schema.tree || schema.definition || {};
  const aliasMap = {};
  for (const [k, v] of Object.entries(definition)) {
    if (v && typeof v === 'object' && v.alias) {
      aliasMap[v.alias] = k;
    }
  }

  const result = {};
  for (const [key, val] of Object.entries(filter)) {
    let resolvedKey = key;
    if (aliasMap[key]) {
      resolvedKey = aliasMap[key];
    }

    if (key === '$or' && Array.isArray(val)) {
      result[resolvedKey] = val.map(item => normalizeQueryFilter(item, schema));
    } else if (key === '$and' && Array.isArray(val)) {
      result[resolvedKey] = val.map(item => normalizeQueryFilter(item, schema));
    } else if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof RegExp) && !(val instanceof Date)) {
      result[resolvedKey] = normalizeQueryFilter(val, schema);
    } else {
      result[resolvedKey] = val;
    }
  }
  return result;
}

// Compile MongoDB query to SQL WHERE clause for PG JSONB
function compileQuery(query, params = [], schema = null) {
  const originalQuery = { ...query };
  if (schema) {
    query = normalizeQueryFilter(query, schema);
  }

  if (!query || typeof query !== 'object' || Object.keys(query).length === 0) {
    return { where: '1=1', params };
  }

  console.log('[pgMongoose debug] compileQuery normalized:', originalQuery, '->', query);

  const parts = [];

  for (const [key, val] of Object.entries(query)) {
    if (key === '$or') {
      if (Array.isArray(val) && val.length > 0) {
        const subParts = [];
        for (const sub of val) {
          const res = compileQuery(sub, params, schema);
          subParts.push(`(${res.where})`);
        }
        parts.push(`(${subParts.join(' OR ')})`);
      }
      continue;
    }

    if (key === '$and') {
      if (Array.isArray(val) && val.length > 0) {
        const subParts = [];
        for (const sub of val) {
          const res = compileQuery(sub, params, schema);
          subParts.push(`(${res.where})`);
        }
        parts.push(`(${subParts.join(' AND ')})`);
      }
      continue;
    }

    if (key.includes('.')) {
      const [parentKey, childKey] = key.split('.');
      params.push(JSON.stringify([{ [childKey]: String(val) }]));
      parts.push(`data->'${parentKey}' @> $${params.length}::jsonb`);
      continue;
    }

    const isId = key === '_id' || key === 'id';

    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof RegExp) && !(val instanceof Date) && !ObjectId.isValid(val)) {
      for (const [op, opVal] of Object.entries(val)) {
        if (op === '$ne') {
          if (opVal === null) {
            parts.push(isId ? `_id IS NOT NULL` : `(data->>'${key}') IS NOT NULL`);
          } else {
            params.push(String(opVal));
            parts.push(isId ? `_id <> $${params.length}` : `(data->>'${key}') <> $${params.length}`);
          }
        } else if (op === '$nin') {
          if (Array.isArray(opVal) && opVal.length > 0) {
            const list = opVal.map(x => String(x));
            params.push(list);
            parts.push(isId ? `NOT (_id = ANY($${params.length}))` : `NOT (data->>'${key}' = ANY($${params.length}))`);
          } else {
            parts.push('1=1');
          }
        } else if (op === '$in') {
          if (Array.isArray(opVal) && opVal.length > 0) {
            const hasNull = opVal.includes(null) || opVal.includes(undefined);
            const nonNulls = opVal.filter(x => x !== null && x !== undefined);

            const subParts = [];
            if (nonNulls.length > 0) {
              const list = nonNulls.map(x => String(x));
              params.push(list);
              subParts.push(isId ? `_id = ANY($${params.length})` : `data->>'${key}' = ANY($${params.length})`);
            }
            if (hasNull) {
              if (isId) {
                subParts.push(`_id IS NULL`);
              } else {
                subParts.push(`data->>'${key}' IS NULL OR NOT (data ? '${key}')`);
              }
            }
            if (subParts.length > 0) {
              parts.push(`(${subParts.join(' OR ')})`);
            } else {
              parts.push('1=0');
            }
          } else {
            parts.push('1=0');
          }
        } else if (op === '$exists') {
          const exists = !!opVal;
          parts.push(isId ? (exists ? `_id IS NOT NULL` : `_id IS NULL`) : (exists ? `data ? '${key}'` : `NOT (data ? '${key}')`));
        } else if (op === '$gte' || op === '$lte' || op === '$gt' || op === '$lt') {
          const pgOp = op === '$gte' ? '>=' : op === '$lte' ? '<=' : op === '$gt' ? '>' : '<';
          const isDate = opVal instanceof Date || (typeof opVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(opVal));
          const isNum = typeof opVal === 'number';

          if (key === 'createdAt' || key === 'created_at') {
            params.push(opVal);
            parts.push(`created_at ${pgOp} $${params.length}`);
          } else if (key === 'updatedAt' || key === 'updated_at') {
            params.push(opVal);
            parts.push(`updated_at ${pgOp} $${params.length}`);
          } else if (isDate) {
            params.push(opVal);
            parts.push(`(data->>'${key}')::timestamptz ${pgOp} $${params.length}::timestamptz`);
          } else if (isNum) {
            params.push(opVal);
            parts.push(`(data->>'${key}')::numeric ${pgOp} $${params.length}`);
          } else {
            params.push(String(opVal));
            parts.push(`data->>'${key}' ${pgOp} $${params.length}`);
          }
        } else if (op === '$regex') {
          let pattern = opVal;
          let flags = '';
          if (val.$options) flags = val.$options;
          const isCaseInsensitive = flags.includes('i');
          const pgOp = isCaseInsensitive ? '~*' : '~';
          params.push(pattern);
          parts.push(isId ? `_id ${pgOp} $${params.length}` : `data->>'${key}' ${pgOp} $${params.length}`);
        }
      }
    } else if (val instanceof RegExp) {
      const isCaseInsensitive = val.flags.includes('i');
      const pgOp = isCaseInsensitive ? '~*' : '~';
      params.push(val.source);
      parts.push(isId ? `_id ${pgOp} $${params.length}` : `data->>'${key}' ${pgOp} $${params.length}`);
    } else {
      if (val === null) {
        parts.push(isId ? `_id IS NULL` : `(data->>'${key}') IS NULL`);
      } else {
        params.push(String(val));
        parts.push(isId ? `_id = $${params.length}` : `data->>'${key}' = $${params.length}`);
      }
    }
  }

  return {
    where: parts.length > 0 ? parts.join(' AND ') : '1=1',
    params
  };
}

// In-memory expression resolver for aggregation
function resolveExpr(doc, expr) {
  if (typeof expr === 'string' && expr.startsWith('$')) {
    const key = expr.substring(1);
    if (key.includes('.')) {
      const parts = key.split('.');
      let curr = doc;
      for (const p of parts) {
        if (curr && typeof curr === 'object') {
          curr = curr[p];
        } else {
          return undefined;
        }
      }
      return curr;
    }
    return doc[key];
  }
  return expr;
}

// In-memory matcher for intermediate query stage of aggregation
function matchDoc(doc, matchSpec) {
  if (!matchSpec || typeof matchSpec !== 'object') return true;
  for (const [k, val] of Object.entries(matchSpec)) {
    const docVal = doc[k];
    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      for (const [op, opVal] of Object.entries(val)) {
        if (op === '$ne') {
          if (String(docVal) === String(opVal)) return false;
        } else if (op === '$nin') {
          if (Array.isArray(opVal) && opVal.map(String).includes(String(docVal))) return false;
        } else if (op === '$in') {
          if (Array.isArray(opVal) && !opVal.map(String).includes(String(docVal))) return false;
        } else if (op === '$gte') {
          if (!(docVal >= opVal)) return false;
        } else if (op === '$lte') {
          if (!(docVal <= opVal)) return false;
        } else if (op === '$gt') {
          if (!(docVal > opVal)) return false;
        } else if (op === '$lt') {
          if (!(docVal < opVal)) return false;
        }
      }
    } else {
      if (String(docVal) !== String(val)) return false;
    }
  }
  return true;
}

// Apply update query object to data
function applyUpdateQuery(data, updateQuery, isInsert = false) {
  const nextData = { ...data };
  if (!updateQuery || typeof updateQuery !== 'object') return nextData;

  const hasOperators = Object.keys(updateQuery).some(k => k.startsWith('$'));

  if (!hasOperators) {
    for (const [k, v] of Object.entries(updateQuery)) {
      nextData[k] = v;
    }
    return nextData;
  }

  if (updateQuery.$set) {
    for (const [k, v] of Object.entries(updateQuery.$set)) {
      nextData[k] = v;
    }
  }
  if (isInsert && updateQuery.$setOnInsert) {
    for (const [k, v] of Object.entries(updateQuery.$setOnInsert)) {
      nextData[k] = v;
    }
  }
  if (updateQuery.$unset) {
    for (const k of Object.keys(updateQuery.$unset)) {
      delete nextData[k];
    }
  }
  if (updateQuery.$push) {
    for (const [k, v] of Object.entries(updateQuery.$push)) {
      if (!Array.isArray(nextData[k])) nextData[k] = [];
      if (v && typeof v === 'object' && v.$each) {
        nextData[k].push(...v.$each);
      } else {
        nextData[k].push(v);
      }
    }
  }
  if (updateQuery.$pull) {
    for (const [k, v] of Object.entries(updateQuery.$pull)) {
      if (Array.isArray(nextData[k])) {
        nextData[k] = nextData[k].filter(item => {
          if (v && typeof v === 'object') {
            return !Object.entries(v).every(([subK, subV]) => item[subK] === subV);
          }
          return item !== v;
        });
      }
    }
  }

  return nextData;
}

// Wrap subdocument array fields to support .id(), .pull(), .push() override and .toObject() on items
function wrapArrayField(arr, subSchema) {
  if (!Array.isArray(arr)) return arr;

  if (!arr.id) {
    Object.defineProperty(arr, 'id', {
      value: function (idStr) {
        return this.find(x => String(x._id || x.id) === String(idStr)) || null;
      },
      enumerable: false,
      writable: true,
      configurable: true
    });
  }

  if (!arr.pull) {
    Object.defineProperty(arr, 'pull', {
      value: function (idStr) {
        const idx = this.findIndex(x => String(x._id || x.id) === String(idStr));
        if (idx !== -1) {
          this.splice(idx, 1);
        }
        return this;
      },
      enumerable: false,
      writable: true,
      configurable: true
    });
  }

  const originalPush = arr.push;
  arr.push = function (...args) {
    const wrappedArgs = args.map(item => {
      if (item && typeof item === 'object') {
        if (!item._id) {
          item._id = new ObjectId().toString();
        }
        if (!item.toObject) {
          Object.defineProperty(item, 'toObject', {
            value: function () {
              const copy = { ...this };
              delete copy.toObject;
              return copy;
            },
            enumerable: false,
            writable: true,
            configurable: true
          });
        }
        if (subSchema) {
          setupGettersSetters(item, subSchema);
        }
      }
      return item;
    });
    return originalPush.apply(this, wrappedArgs);
  };

  arr.forEach(item => {
    if (item && typeof item === 'object') {
      if (!item._id) {
        item._id = new ObjectId().toString();
      }
      if (!item.toObject) {
        Object.defineProperty(item, 'toObject', {
          value: function () {
            const copy = { ...this };
            delete copy.toObject;
            return copy;
          },
          enumerable: false,
          writable: true,
          configurable: true
        });
      }
      if (subSchema) {
        setupGettersSetters(item, subSchema);
      }
    }
  });

  return arr;
}

// Set up getters/setters for virtuals/aliases
function setupGettersSetters(doc, schema) {
  if (!schema) return;

  const definition = schema.definition || schema;

  // Standard _id to id mapping (only if "id" is not a defined schema field)
  if (!definition.hasOwnProperty('id') && !definition.id) {
    Object.defineProperty(doc, 'id', {
      get() {
        return this._id ? String(this._id) : undefined;
      },
      set(v) {
        this._id = v;
      },
      enumerable: true,
      configurable: true
    });
  }

  // Array fields wrapping
  for (const [key, val] of Object.entries(definition)) {
    const isArray = Array.isArray(val) || val === Array || (val && val.type === Array);
    if (isArray) {
      const subSchema = (Array.isArray(val) && val[0] instanceof Schema) ? val[0] : (Array.isArray(val) ? val[0] : null);
      const internalKey = '_' + key;
      doc[internalKey] = wrapArrayField(doc[key] || [], subSchema);

      Object.defineProperty(doc, key, {
        get() {
          return this[internalKey];
        },
        set(v) {
          this[internalKey] = wrapArrayField(v || [], subSchema);
        },
        enumerable: true,
        configurable: true
      });
    }
  }

  // Aliases
  for (const [key, val] of Object.entries(definition)) {
    if (val && typeof val === 'object' && val.alias) {
      const alias = val.alias;
      Object.defineProperty(doc, alias, {
        get() {
          return this[key];
        },
        set(v) {
          this[key] = v;
        },
        enumerable: true,
        configurable: true
      });
    }
  }
  // Virtuals
  for (const [name, virt] of Object.entries(schema.virtuals || {})) {
    Object.defineProperty(doc, name, {
      get() {
        if (virt.get) return virt.get.call(this);
        return undefined;
      },
      set(v) {
        if (virt.set) virt.set.call(this, v);
      },
      enumerable: true,
      configurable: true
    });
  }
}

// Query builder chain
class QueryBuilder {
  constructor(model, filter = {}, single = false) {
    this.model = model;
    this.filter = filter;
    this.single = single;
    this._select = null;
    this._sort = null;
    this._skip = 0;
    this._limit = null;
    this._lean = false;
    this._populatePaths = [];
  }
  select(fields) {
    this._select = fields;
    return this;
  }
  sort(sortSpec) {
    this._sort = sortSpec;
    return this;
  }
  skip(n) {
    this._skip = Number(n) || 0;
    return this;
  }
  limit(n) {
    this._limit = Number(n) || null;
    return this;
  }
  lean() {
    this._lean = true;
    return this;
  }
  populate(path) {
    this._populatePaths.push(path);
    return this;
  }
  async exec() {
    const tableName = this.model.tableName;
    const { where, params } = compileQuery(this.filter, [], this.model.schema);

    let sql = `SELECT * FROM ${tableName} WHERE ${where}`;

    if (this._sort) {
      const sortParts = [];
      let specs = this._sort;
      if (typeof specs === 'string') {
        specs = specs.split(/\s+/).reduce((acc, curr) => {
          if (curr.startsWith('-')) {
            acc[curr.substring(1)] = -1;
          } else {
            acc[curr] = 1;
          }
          return acc;
        }, {});
      }
      for (const [k, v] of Object.entries(specs)) {
        const order = v === -1 ? 'DESC' : 'ASC';
        if (k === 'createdAt' || k === 'created_at') {
          sortParts.push(`created_at ${order}`);
        } else if (k === 'updatedAt' || k === 'updated_at') {
          sortParts.push(`updated_at ${order}`);
        } else if (k === '_id' || k === 'id') {
          sortParts.push(`_id ${order}`);
        } else {
          sortParts.push(`(data->>'${k}') ${order}`);
        }
      }
      if (sortParts.length > 0) {
        sql += ` ORDER BY ${sortParts.join(', ')}`;
      }
    }

    if (this._limit !== null) {
      sql += ` LIMIT ${this._limit}`;
    }
    if (this._skip > 0) {
      sql += ` OFFSET ${this._skip}`;
    }

    const res = await pool.query(sql, params);
    const docs = res.rows.map(row => {
      const data = { _id: row._id, ...row.data };
      if (!data.createdAt) data.createdAt = row.created_at;
      if (!data.updatedAt) data.updatedAt = row.updated_at;

      if (this._lean) {
        return data;
      }
      return new this.model(data);
    });

    // Handle populate
    if (this._populatePaths && this._populatePaths.length > 0) {
      for (const path of this._populatePaths) {
        const fieldSpec = this.model.schema && this.model.schema.definition[path];
        const refModelName = fieldSpec && fieldSpec.ref;
        if (refModelName) {
          const RefModel = models[refModelName];
          if (RefModel) {
            for (const doc of docs) {
              const refId = doc[path];
              if (refId && typeof refId === 'string') {
                const refDoc = await RefModel.findById(refId).lean().exec();
                if (refDoc) {
                  doc[path] = refDoc;
                }
              }
            }
          }
        }
      }
    }

    if (this.single) {
      return docs[0] || null;
    }
    return docs;
  }
  then(onfulfilled, onrejected) {
    return this.exec().then(onfulfilled, onrejected);
  }
}

// Helper to create PostgreSQL table and indexes
async function ensureTableAndIndexes(tableName, schema) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      _id VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (schema && schema.indexesList) {
    for (const idx of schema.indexesList) {
      const indexName = idx.options.name || ('idx_' + tableName + '_' + Object.keys(idx.fields).join('_'));
      const isUnique = !!idx.options.unique;
      const columns = Object.keys(idx.fields).map(f => {
        if (f === '_id') return '_id';
        return `(data->>'${f}')`;
      }).join(', ');

      let whereClause = '';
      if (idx.options.partialFilterExpression) {
        const exprs = [];
        for (const [k, v] of Object.entries(idx.options.partialFilterExpression)) {
          if (v && typeof v === 'object' && v.$type === 'string') {
            exprs.push(`(data->>'${k}') IS NOT NULL AND (data->>'${k}') <> ''`);
          }
        }
        if (exprs.length > 0) {
          whereClause = ` WHERE ${exprs.join(' AND ')}`;
        }
      }

      const query = `
        CREATE ${isUnique ? 'UNIQUE' : ''} INDEX IF NOT EXISTS ${indexName} 
        ON ${tableName} (${columns})${whereClause};
      `;
      try {
        await pool.query(query);
      } catch (err) {
        // Safe to ignore index creation failures
      }
    }
  }
}

const modelToTableMap = {
  User: 'users',
  Organization: 'organizations',
  SidebarPermission: 'sidebar_permissions',
  SidebarMenu: 'sidebar_menus',
  Role: 'roles',
  Industry: 'industries',
  ScreenField: 'screen_fields',
  ScreenPermission: 'screen_permissions',
  WhatsAppConfig: 'whatsapp_configs',
  Booking: 'bookings',
  Faq: 'faqs',
  Designation: 'designations',
  LeadDistributionRule: 'lead_distribution_rules',
  LeadRotationRule: 'lead_rotation_rules',
  LeadReassignmentHistory: 'lead_reassignment_histories',
  OrganizationResources: 'resource_items',
  Workspace: 'workspaces',
  CallLog: 'call_logs',
  Branch: 'branches',
  Coupon: 'coupons',
  Task: 'tasks',
  WorkingDay: 'working_days',
  AnalyticsConfig: 'analytics_configs',
  PricingPlan: 'pricing_plans',
  Holiday: 'holidays',
  Team: 'teams',
  News: 'news',
  ApiToken: 'api_tokens',
  ApiData: 'api_data_logs',
  ImportLog: 'import_logs',
  Screen: 'screens',
  DropdownOption: 'dropdown_options',
  RoleActionPermission: 'role_action_permissions',
  SidebarConfig: 'sidebar_configs',
};

// Main Model generator function
function createModel(modelName, schema) {
  const tableName = modelToTableMap[modelName] || (modelName.toLowerCase() + 's');

  // Background ensure table creation
  ensureTableAndIndexes(tableName, schema).catch(err => {
    console.error(`Failed to ensure table ${tableName}:`, err.message);
  });

  class ModelClass {
    constructor(data = {}) {
      let finalId = data._id || new ObjectId().toString();
      if (finalId && typeof finalId === 'object' && typeof finalId.toString === 'function') {
        finalId = finalId.toString();
      }
      this._id = finalId;
      setupGettersSetters(this, schema);
      for (const [k, v] of Object.entries(data)) {
        if (k !== '_id') this[k] = v;
      }
    }

    async save() {
      // Pre-save hooks
      if (schema && schema.preHooks.save) {
        for (const hook of schema.preHooks.save) {
          await new Promise((resolve, reject) => {
            hook.call(this, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }

      const plain = {};
      for (const [k, v] of Object.entries(this)) {
        if (k.startsWith('_') && k !== '_id' && k !== '__v') continue;
        plain[k] = v;
      }
      delete plain._id;

      const now = new Date();
      // Check if document exists
      const res = await pool.query(`SELECT 1 FROM ${tableName} WHERE _id = $1`, [this._id]);
      if (res.rows.length > 0) {
        await pool.query(`
          UPDATE ${tableName} 
          SET data = $1, updated_at = $2 
          WHERE _id = $3
        `, [JSON.stringify(plain), now, this._id]);
      } else {
        await pool.query(`
          INSERT INTO ${tableName} (_id, data, created_at, updated_at) 
          VALUES ($1, $2, $3, $4)
        `, [this._id, JSON.stringify(plain), now, now]);
      }
      return this;
    }

    toObject(opts) {
      const obj = {};
      for (const [k, v] of Object.entries(this)) {
        if (k.startsWith('_') && k !== '_id' && k !== '__v') continue;
        obj[k] = v;
      }
      if (opts && (opts.virtuals || opts.getters)) {
        obj.id = this.id;
        if (schema) {
          for (const name of Object.keys(schema.virtuals)) {
            obj[name] = this[name];
          }
          for (const [key, val] of Object.entries(schema.tree)) {
            if (val && val.alias) {
              obj[val.alias] = this[key];
            }
          }
        }
      }
      return obj;
    }

    toJSON(opts) {
      return this.toObject(opts || { virtuals: true, getters: true });
    }

    isModified(path) {
      // Used by pre-save validation, always true for simplicity
      return true;
    }

    markModified(path) {
      // Dummy implementation for compatibility
    }

    static async syncIndexes() {
      return [];
    }

    // Static operations
    static find(query = {}) {
      return new QueryBuilder(this, query, false);
    }

    static findOne(query = {}) {
      return new QueryBuilder(this, query, true);
    }

    static findById(id) {
      return new QueryBuilder(this, { _id: id }, true);
    }

    static countDocuments(query = {}) {
      return toQueryLike(async () => {
        const { where, params } = compileQuery(query, [], this.schema);
        const res = await pool.query(`SELECT COUNT(*)::integer as count FROM ${tableName} WHERE ${where}`, params);
        return res.rows[0].count;
      });
    }

    static estimatedDocumentCount() {
      return this.countDocuments({});
    }

    static async bulkWrite(ops, options = {}) {
      const results = {
        ok: 1,
        writeErrors: [],
        writeConcernErrors: [],
        insertedIds: {},
        nInserted: 0,
        nUpserted: 0,
        nMatched: 0,
        nModified: 0,
        nRemoved: 0
      };

      for (let index = 0; index < ops.length; index++) {
        const op = ops[index];
        if (op.updateOne) {
          const { filter, update, upsert } = op.updateOne;
          const exists = await this.findOne(filter).lean().exec();
          if (exists) {
            await this.findOneAndUpdate(filter, update, { new: true }).exec();
            results.nMatched++;
            results.nModified++;
          } else if (upsert) {
            await this.findOneAndUpdate(filter, update, { upsert: true, new: true }).exec();
            results.nUpserted++;
          }
        }
      }
      return results;
    }

    static deleteOne(query = {}) {
      return toQueryLike(async () => {
        const { where, params } = compileQuery(query, [], this.schema);
        const res = await pool.query(`DELETE FROM ${tableName} WHERE _id IN (SELECT _id FROM ${tableName} WHERE ${where} LIMIT 1)`, params);
        return { deletedCount: res.rowCount };
      });
    }

    static deleteMany(query = {}) {
      return toQueryLike(async () => {
        const { where, params } = compileQuery(query, [], this.schema);
        const res = await pool.query(`DELETE FROM ${tableName} WHERE ${where}`, params);
        return { deletedCount: res.rowCount };
      });
    }

    static findByIdAndDelete(id) {
      return toQueryLike(async () => {
        const res = await pool.query(`DELETE FROM ${tableName} WHERE _id = $1`, [String(id)]);
        return { deletedCount: res.rowCount };
      });
    }

    static findByIdAndUpdate(id, updateQuery, options = {}) {
      return toQueryLike(async () => {
        const res = await pool.query(`SELECT * FROM ${tableName} WHERE _id = $1`, [String(id)]);
        if (res.rows.length === 0) return null;

        const row = res.rows[0];
        const nextData = applyUpdateQuery(row.data, updateQuery);
        const now = new Date();
        await pool.query(`
          UPDATE ${tableName} 
          SET data = $1, updated_at = $2 
          WHERE _id = $3
        `, [JSON.stringify(nextData), now, String(id)]);

        const returned = { _id: id, ...nextData, createdAt: row.created_at, updatedAt: now };
        if (options.new) {
          return new this(returned);
        }
        return new this({ _id: id, ...row.data, createdAt: row.created_at, updatedAt: row.updated_at });
      });
    }

    static findOneAndUpdate(query, updateQuery, options = {}) {
      return toQueryLike(async () => {
        const { where, params } = compileQuery(query, [], this.schema);
        const selectSql = `SELECT * FROM ${tableName} WHERE ${where} LIMIT 1`;
        const res = await pool.query(selectSql, params);

        if (res.rows.length === 0) {
          if (options.upsert) {
            const newId = (query && query._id) || new ObjectId().toString();
            let data = {};
            if (query) {
              for (const [k, v] of Object.entries(query)) {
                if (!k.startsWith('$') && typeof v !== 'object') {
                  data[k] = v;
                }
              }
            }
            data = applyUpdateQuery(data, updateQuery, true);
            data._id = newId;

            const now = new Date();
            await pool.query(`
              INSERT INTO ${tableName} (_id, data, created_at, updated_at) 
              VALUES ($1, $2, $3, $4)
            `, [newId, JSON.stringify(data), now, now]);

            return new this({ _id: newId, ...data, createdAt: now, updatedAt: now });
          }
          return null;
        }

        const row = res.rows[0];
        const nextData = applyUpdateQuery(row.data, updateQuery);
        const now = new Date();
        await pool.query(`
          UPDATE ${tableName} 
          SET data = $1, updated_at = $2 
          WHERE _id = $3
        `, [JSON.stringify(nextData), now, row._id]);

        const returned = { _id: row._id, ...nextData, createdAt: row.created_at, updatedAt: now };
        if (options.new) {
          return new this(returned);
        }
        return new this({ _id: row._id, ...row.data, createdAt: row.created_at, updatedAt: row.updated_at });
      });
    }

    static updateOne(query, update, options = {}) {
      return toQueryLike(async () => {
        const { where, params } = compileQuery(query, [], this.schema);
        const selectSql = `SELECT * FROM ${tableName} WHERE ${where} LIMIT 1`;
        const res = await pool.query(selectSql, params);

        if (res.rows.length === 0) {
          if (options.upsert) {
            const nextData = applyUpdateQuery({}, update);
            for (const [k, v] of Object.entries(query)) {
              if (!k.startsWith('$') && !k.includes('.') && nextData[k] === undefined) {
                nextData[k] = v;
              }
            }
            const doc = new this(nextData);
            await doc.save();
            return { modifiedCount: 0, matchedCount: 0, upsertedCount: 1, upsertedId: doc._id };
          }
          return { modifiedCount: 0, matchedCount: 0 };
        }

        const row = res.rows[0];
        const nextData = applyUpdateQuery(row.data, update);
        const now = new Date();
        await pool.query(`
          UPDATE ${tableName} 
          SET data = $1, updated_at = $2 
          WHERE _id = $3
        `, [JSON.stringify(nextData), now, row._id]);
        return { modifiedCount: 1, matchedCount: 1 };
      });
    }

    static updateMany(query, update, options = {}) {
      return toQueryLike(async () => {
        const { where, params } = compileQuery(query, [], this.schema);
        const selectSql = `SELECT * FROM ${tableName} WHERE ${where}`;
        const res = await pool.query(selectSql, params);

        const now = new Date();
        for (const row of res.rows) {
          const nextData = applyUpdateQuery(row.data, update);
          await pool.query(`
            UPDATE ${tableName} 
            SET data = $1, updated_at = $2 
            WHERE _id = $3
          `, [JSON.stringify(nextData), now, row._id]);
        }
        return { modifiedCount: res.rows.length, matchedCount: res.rows.length };
      });
    }

    static async create(data) {
      if (Array.isArray(data)) {
        const results = [];
        for (const item of data) {
          const doc = new this(item);
          await doc.save();
          results.push(doc);
        }
        return results;
      }
      const doc = new this(data);
      await doc.save();
      return doc;
    }

    static async insertMany(dataList) {
      const results = [];
      for (const item of dataList) {
        const doc = new this(item);
        await doc.save();
        results.push(doc);
      }
      return results;
    }

    static async aggregate(pipeline = []) {
      let currentDocs = [];
      let matchStageIndex = -1;

      const matchStage = pipeline.find((p, idx) => {
        if (p.$match) {
          matchStageIndex = idx;
          return true;
        }
        return false;
      });

      if (matchStage) {
        const { where, params } = compileQuery(matchStage.$match, [], this.schema);
        const res = await pool.query(`SELECT * FROM ${tableName} WHERE ${where}`, params);
        currentDocs = res.rows.map(row => ({ _id: row._id, ...row.data, createdAt: row.created_at, updatedAt: row.updated_at }));
      } else {
        const res = await pool.query(`SELECT * FROM ${tableName}`);
        currentDocs = res.rows.map(row => ({ _id: row._id, ...row.data, createdAt: row.created_at, updatedAt: row.updated_at }));
      }

      for (let i = 0; i < pipeline.length; i++) {
        if (i === matchStageIndex) continue;

        const stage = pipeline[i];
        const stageKey = Object.keys(stage)[0];
        const stageVal = stage[stageKey];

        if (stageKey === '$match') {
          currentDocs = currentDocs.filter(doc => matchDoc(doc, stageVal));
        } else if (stageKey === '$group') {
          const groupKeyExpr = stageVal._id;
          const groups = new Map();

          for (const doc of currentDocs) {
            let groupKeyValue = null;
            if (typeof groupKeyExpr === 'string' && groupKeyExpr.startsWith('$')) {
              groupKeyValue = resolveExpr(doc, groupKeyExpr);
            } else if (groupKeyExpr && typeof groupKeyExpr === 'object') {
              groupKeyValue = {};
              for (const [k, v] of Object.entries(groupKeyExpr)) {
                groupKeyValue[k] = resolveExpr(doc, v);
              }
              groupKeyValue = JSON.stringify(groupKeyValue);
            }

            const groupKeyStr = typeof groupKeyValue === 'object' ? JSON.stringify(groupKeyValue) : String(groupKeyValue);
            if (!groups.has(groupKeyStr)) {
              groups.set(groupKeyStr, { key: groupKeyValue, docs: [] });
            }
            groups.get(groupKeyStr).docs.push(doc);
          }

          const nextDocs = [];
          for (const { key, docs } of groups.values()) {
            const groupedDoc = {};
            if (typeof groupKeyExpr === 'object') {
              groupedDoc._id = typeof key === 'string' ? JSON.parse(key) : key;
            } else {
              groupedDoc._id = key;
            }

            for (const [field, accExpr] of Object.entries(stageVal)) {
              if (field === '_id') continue;

              const accOp = Object.keys(accExpr)[0];
              const accVal = accExpr[accOp];

              if (accOp === '$sum') {
                let sum = 0;
                for (const d of docs) {
                  const val = typeof accVal === 'number' ? accVal : (resolveExpr(d, accVal) || 0);
                  sum += Number(val) || 0;
                }
                groupedDoc[field] = sum;
              } else if (accOp === '$addToSet') {
                const set = new Set();
                for (const d of docs) {
                  const val = resolveExpr(d, accVal);
                  if (val !== undefined && val !== null) {
                    set.add(typeof val === 'object' ? String(val) : val);
                  }
                }
                groupedDoc[field] = Array.from(set);
              } else if (accOp === '$push') {
                const list = [];
                for (const d of docs) {
                  const val = resolveExpr(d, accVal);
                  if (val !== undefined) list.push(val);
                }
                groupedDoc[field] = list;
              } else if (accOp === '$first') {
                groupedDoc[field] = docs[0] ? resolveExpr(docs[0], accVal) : null;
              } else if (accOp === '$last') {
                groupedDoc[field] = docs[docs.length - 1] ? resolveExpr(docs[docs.length - 1], accVal) : null;
              }
            }
            nextDocs.push(groupedDoc);
          }
          currentDocs = nextDocs;
        } else if (stageKey === '$sort') {
          currentDocs.sort((a, b) => {
            for (const [k, v] of Object.entries(stageVal)) {
              const valA = a[k];
              const valB = b[k];
              const order = v === -1 ? -1 : 1;
              if (valA < valB) return -1 * order;
              if (valA > valB) return 1 * order;
            }
            return 0;
          });
        } else if (stageKey === '$limit') {
          currentDocs = currentDocs.slice(0, Number(stageVal) || currentDocs.length);
        } else if (stageKey === '$skip') {
          currentDocs = currentDocs.slice(Number(stageVal) || 0);
        } else if (stageKey === '$project') {
          currentDocs = currentDocs.map(doc => {
            const projected = {};
            for (const [k, v] of Object.entries(stageVal)) {
              if (v === 1 || v === true) {
                projected[k] = doc[k];
              } else if (typeof v === 'string' && v.startsWith('$')) {
                projected[k] = resolveExpr(doc, v);
              }
            }
            if (stageVal._id === undefined || stageVal._id === 1 || stageVal._id === true) {
              projected._id = doc._id;
            }
            return projected;
          });
        }
      }
      return currentDocs;
    }
  }

  ModelClass.modelName = modelName;
  ModelClass.tableName = tableName;
  ModelClass.schema = schema;

  // Mixin schema custom methods
  if (schema && schema.methods) {
    for (const [k, v] of Object.entries(schema.methods)) {
      ModelClass.prototype[k] = v;
    }
  }
  if (schema && schema.statics) {
    for (const [k, v] of Object.entries(schema.statics)) {
      ModelClass[k] = v;
    }
  }

  models[modelName] = ModelClass;
  return ModelClass;
}

// Global plugin registration
const plugins = [];
function plugin(fn) {
  plugins.push(fn);
}

// Mock Mongoose export module
module.exports = {
  pool,
  connect: async (uri) => {
    console.log('[pgMongoose] Connected to PostgreSQL at', pool.options.connectionString);
  },
  disconnect: async () => {
    await pool.end();
    console.log('[pgMongoose] Disconnected from PostgreSQL');
  },
  Schema: Schema,
  model: (name, schema) => {
    if (!schema) {
      const existing = models[name];
      if (!existing) throw new Error(`Model ${name} not registered`);
      return existing;
    }
    // Apply global plugins
    for (const p of plugins) {
      schema.plugin(p);
    }
    return createModel(name, schema);
  },
  plugin,
  Types: {
    ObjectId: ObjectId,
    Mixed: 'Mixed'
  },
  isValidObjectId: ObjectId.isValid,
  connection: {
    collection: (name) => {
      const tableName = name.toLowerCase();
      return {
        dropIndex: async (indexName) => {
          try {
            await pool.query(`DROP INDEX IF EXISTS ${indexName}`);
          } catch (e) { }
        },
        find: (filter = {}) => {
          return {
            toArray: async () => {
              const checkTable = await pool.query(
                "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = $1",
                [tableName]
              );
              if (checkTable.rows.length === 0) return [];
              const { where, params } = compileQuery(filter);
              const res = await pool.query(`SELECT * FROM ${tableName} WHERE ${where}`, params);
              return res.rows.map(row => ({
                _id: row._id,
                ...row.data,
                createdAt: row.created_at,
                updatedAt: row.updated_at
              }));
            }
          };
        },
        countDocuments: async (filter = {}) => {
          const checkTable = await pool.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = $1",
            [tableName]
          );
          if (checkTable.rows.length === 0) return 0;
          const { where, params } = compileQuery(filter);
          const res = await pool.query(`SELECT COUNT(*)::integer as count FROM ${tableName} WHERE ${where}`, params);
          return res.rows[0].count;
        },
        deleteMany: async (filter = {}) => {
          const checkTable = await pool.query(
            "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = $1",
            [tableName]
          );
          if (checkTable.rows.length === 0) return;
          const { where, params } = compileQuery(filter);
          await pool.query(`DELETE FROM ${tableName} WHERE ${where}`, params);
        }
      };
    },
    db: {
      listCollections: () => ({
        toArray: async () => {
          const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
          return res.rows.map(r => ({ name: r.table_name }));
        }
      }),
      collection: (name) => {
        const tableName = name.toLowerCase();
        return {
          find: (filter = {}) => {
            return {
              toArray: async () => {
                const checkTable = await pool.query(
                  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = $1",
                  [tableName]
                );
                if (checkTable.rows.length === 0) return [];
                const { where, params } = compileQuery(filter);
                const res = await pool.query(`SELECT * FROM ${tableName} WHERE ${where}`, params);
                return res.rows.map(row => ({
                  _id: row._id,
                  ...row.data,
                  createdAt: row.created_at,
                  updatedAt: row.updated_at
                }));
              }
            };
          },
          countDocuments: async (filter = {}) => {
            const checkTable = await pool.query(
              "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = $1",
              [tableName]
            );
            if (checkTable.rows.length === 0) return 0;
            const { where, params } = compileQuery(filter);
            const res = await pool.query(`SELECT COUNT(*)::integer as count FROM ${tableName} WHERE ${where}`, params);
            return res.rows[0].count;
          },
          deleteMany: async (filter = {}) => {
            const checkTable = await pool.query(
              "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = $1",
              [tableName]
            );
            if (checkTable.rows.length === 0) return;
            const { where, params } = compileQuery(filter);
            await pool.query(`DELETE FROM ${tableName} WHERE ${where}`, params);
          }
        };
      }
    }
  }
};
