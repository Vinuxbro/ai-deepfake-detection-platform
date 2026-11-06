// Minimal ambient types for Node's built-in SQLite (node:sqlite),
// which @types/node does not yet ship. Covers only the API we use.
declare module "node:sqlite" {
  export class StatementSync {
    run(
      ...params: unknown[]
    ): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }
  export class DatabaseSync {
    constructor(path: string, options?: Record<string, unknown>);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
