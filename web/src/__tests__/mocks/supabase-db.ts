/**
 * Supabase Database Mock
 *
 * Provides mock implementations for Supabase database operations.
 * Supports chainable query builder pattern with configurable responses.
 */
import { vi } from 'vitest';

// In-memory data store for tests
const dataStore: Record<string, unknown[]> = {
  journal_entries: [],
  theses: [],
  trades: [],
  positions: [],
  watchlists: [],
  alerts: [],
};

// Track query state
let queryState: {
  table: string;
  filters: Array<{ column: string; operator: string; value: unknown }>;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  single: boolean;
} = {
  table: '',
  filters: [],
  single: false,
};

/**
 * Reset the query state
 */
function resetQueryState() {
  queryState = { table: '', filters: [], single: false };
}

/**
 * Seed test data into the mock database
 */
export function seedData(table: string, data: unknown[]) {
  dataStore[table] = [...data];
}

/**
 * Clear all test data
 */
export function clearData() {
  Object.keys(dataStore).forEach((key) => {
    dataStore[key] = [];
  });
}

/**
 * Get current data from a table
 */
export function getData(table: string): unknown[] {
  return dataStore[table] || [];
}

/**
 * Apply filters to data
 */
function applyFilters(data: unknown[], filters: typeof queryState.filters): unknown[] {
  return data.filter((item: any) => {
    return filters.every((filter) => {
      const value = item[filter.column];
      switch (filter.operator) {
        case 'eq':
          return value === filter.value;
        case 'neq':
          return value !== filter.value;
        case 'gt':
          return value > filter.value;
        case 'gte':
          return value >= filter.value;
        case 'lt':
          return value < filter.value;
        case 'lte':
          return value <= filter.value;
        case 'like':
          return String(value).includes(String(filter.value));
        case 'ilike':
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(value);
        default:
          return true;
      }
    });
  });
}

/**
 * Create a chainable query result
 */
function createQueryResult(operation: 'select' | 'insert' | 'update' | 'delete') {
  const chain: any = {
    eq: vi.fn((column: string, value: unknown) => {
      queryState.filters.push({ column, operator: 'eq', value });
      return chain;
    }),

    neq: vi.fn((column: string, value: unknown) => {
      queryState.filters.push({ column, operator: 'neq', value });
      return chain;
    }),

    gt: vi.fn((column: string, value: unknown) => {
      queryState.filters.push({ column, operator: 'gt', value });
      return chain;
    }),

    gte: vi.fn((column: string, value: unknown) => {
      queryState.filters.push({ column, operator: 'gte', value });
      return chain;
    }),

    lt: vi.fn((column: string, value: unknown) => {
      queryState.filters.push({ column, operator: 'lt', value });
      return chain;
    }),

    lte: vi.fn((column: string, value: unknown) => {
      queryState.filters.push({ column, operator: 'lte', value });
      return chain;
    }),

    like: vi.fn((column: string, value: unknown) => {
      queryState.filters.push({ column, operator: 'like', value });
      return chain;
    }),

    ilike: vi.fn((column: string, value: unknown) => {
      queryState.filters.push({ column, operator: 'ilike', value });
      return chain;
    }),

    in: vi.fn((column: string, values: unknown[]) => {
      queryState.filters.push({ column, operator: 'in', value: values });
      return chain;
    }),

    order: vi.fn((column: string, options?: { ascending?: boolean }) => {
      queryState.orderBy = { column, ascending: options?.ascending ?? true };
      return chain;
    }),

    limit: vi.fn((count: number) => {
      queryState.limit = count;
      return chain;
    }),

    single: vi.fn(() => {
      queryState.single = true;
      return chain;
    }),

    select: vi.fn((_columns?: string) => {
      return chain;
    }),

    // Terminal: resolve the query
    then: (resolve: (result: { data: unknown; error: unknown; count?: number }) => void) => {
      let result: unknown[] = getData(queryState.table);
      result = applyFilters(result, queryState.filters);

      if (queryState.orderBy) {
        const { column, ascending } = queryState.orderBy;
        result.sort((a: any, b: any) => {
          if (a[column] < b[column]) return ascending ? -1 : 1;
          if (a[column] > b[column]) return ascending ? 1 : -1;
          return 0;
        });
      }

      if (queryState.limit) {
        result = result.slice(0, queryState.limit);
      }

      const data = queryState.single ? (result[0] ?? null) : result;
      const count = queryState.single ? undefined : result.length;
      resetQueryState();

      resolve({ data, error: null, count });
    },
  };

  return chain;
}

/**
 * Create mock Supabase database client
 */
export function createMockDb() {
  return {
    from: vi.fn((table: string) => {
      queryState.table = table;
      queryState.filters = [];

      return {
        select: vi.fn((_columns?: string) => createQueryResult('select')),

        insert: vi.fn((data: unknown | unknown[]) => {
          const items = Array.isArray(data) ? data : [data];
          const newItems = items.map((item: any) => ({
            id: item.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
            ...item,
          }));

          dataStore[table] = [...(dataStore[table] || []), ...newItems];

          const chain = createQueryResult('insert');
          // Override then to return inserted data
          chain.then = (resolve: (result: { data: unknown; error: unknown }) => void) => {
            const data = queryState.single ? newItems[0] : newItems;
            resetQueryState();
            resolve({ data, error: null });
          };

          return chain;
        }),

        update: vi.fn((updates: Record<string, unknown>) => {
          const chain = createQueryResult('update');

          chain.then = (resolve: (result: { data: unknown; error: unknown }) => void) => {
            let result = getData(queryState.table);
            result = applyFilters(result, queryState.filters);

            // Apply updates to matching items
            result.forEach((item: any) => {
              Object.assign(item, updates, { updated_at: new Date().toISOString() });
            });

            const data = queryState.single ? result[0] : result;
            resetQueryState();
            resolve({ data, error: null });
          };

          return chain;
        }),

        delete: vi.fn(() => {
          const chain = createQueryResult('delete');

          chain.then = (resolve: (result: { data: unknown; error: unknown; count: number }) => void) => {
            const before = getData(queryState.table).length;
            const remaining = getData(queryState.table).filter((item: any) => {
              return !queryState.filters.every((filter) => {
                const value = item[filter.column];
                return filter.operator === 'eq' ? value === filter.value : true;
              });
            });

            dataStore[queryState.table] = remaining;
            const count = before - remaining.length;
            resetQueryState();
            resolve({ data: null, error: null, count });
          };

          return chain;
        }),

        upsert: vi.fn((data: unknown | unknown[]) => {
          const items = Array.isArray(data) ? data : [data];

          items.forEach((item: any) => {
            const existingIndex = (dataStore[table] || []).findIndex(
              (existing: any) => existing.id === item.id
            );

            if (existingIndex >= 0) {
              Object.assign(dataStore[table][existingIndex], item, {
                updated_at: new Date().toISOString(),
              });
            } else {
              dataStore[table] = [
                ...(dataStore[table] || []),
                {
                  id: item.id || `mock-${Date.now()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...item,
                },
              ];
            }
          });

          return createQueryResult('insert');
        }),
      };
    }),
  };
}
