import type { SupabaseClient } from "@supabase/supabase-js";

// A tiny stand-in for the PostgREST query builder.
//
// Unit tests must never touch a real Supabase project, so this records the
// chain a loader builds (`.eq`, `.or`, `.range`, …) and resolves to a canned
// result. That lets us assert the *shape* of a query — e.g. that browse only
// ever asks for published rows — without a database.
//
// NOTE: this deliberately does NOT emulate RLS. Row-level security is enforced
// by Postgres, so it can only be proven against a real database; see
// test/README.md for the integration-test gap.

export type ChainCall = { method: string; args: unknown[] };

export type QueryResult = {
  data?: unknown;
  count?: number | null;
  error?: unknown;
};

export type RecordedQuery = {
  table: string;
  calls: ChainCall[];
  /** Args of the first call to `method`, or undefined if never called. */
  argsFor: (method: string) => unknown[] | undefined;
  /** Every call to `method` (filters like `.eq` are used repeatedly). */
  allFor: (method: string) => unknown[][];
};

const BUILDER_METHODS = [
  "select",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "is",
  "not",
  "or",
  "like",
  "ilike",
  "contains",
  "overlaps",
  "order",
  "limit",
  "range",
  "maybeSingle",
  "single",
  "insert",
  "update",
  "upsert",
  "delete",
] as const;

type Resolver = QueryResult | ((q: RecordedQuery) => QueryResult);

export type SupabaseMock = {
  client: SupabaseClient;
  /** Every query built during the test, in the order `.from()` was called. */
  queries: RecordedQuery[];
  /** Queries against one table, in order. */
  forTable: (table: string) => RecordedQuery[];
  rpcCalls: { fn: string; args: unknown }[];
};

function resolve(r: Resolver | undefined, q: RecordedQuery): QueryResult {
  if (typeof r === "function") return r(q);
  return r ?? { data: [], count: 0, error: null };
}

export function createSupabaseMock(opts: {
  /** Canned result per table. A function receives the recorded chain. */
  tables?: Record<string, Resolver>;
  /** Canned result per RPC name. */
  rpc?: Record<string, Resolver>;
} = {}): SupabaseMock {
  const queries: RecordedQuery[] = [];
  const rpcCalls: { fn: string; args: unknown }[] = [];

  function makeBuilder(table: string, resolver: Resolver | undefined) {
    const calls: ChainCall[] = [];
    const record: RecordedQuery = {
      table,
      calls,
      argsFor: (method) => calls.find((c) => c.method === method)?.args,
      allFor: (method) =>
        calls.filter((c) => c.method === method).map((c) => c.args),
    };
    queries.push(record);

    const builder: Record<string, unknown> = {
      // Thenable, so a loader can `await` the chain at whatever point it stops
      // adding filters (`.range(...)`, `.order(...)`, `.maybeSingle()`, …).
      then: (
        onFulfilled: (v: QueryResult) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => {
        try {
          const result = resolve(resolver, record);
          return Promise.resolve(
            onFulfilled({ data: [], count: null, error: null, ...result }),
          );
        } catch (e) {
          return onRejected ? Promise.resolve(onRejected(e)) : Promise.reject(e);
        }
      },
    };

    for (const method of BUILDER_METHODS) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args });
        return builder;
      };
    }

    return builder;
  }

  const client = {
    from: (table: string) => makeBuilder(table, opts.tables?.[table]),
    rpc: (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return makeBuilder(`rpc:${fn}`, opts.rpc?.[fn]);
    },
  } as unknown as SupabaseClient;

  return {
    client,
    queries,
    forTable: (table) => queries.filter((q) => q.table === table),
    rpcCalls,
  };
}
