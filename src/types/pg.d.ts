
// src/types/pg.d.ts
// Fallback declaration so TypeScript knows about "pg" during Vercel builds

declare module "pg" {
  import { EventEmitter } from "events";

  export interface PoolConfig {
    user?: string;
    password?: string;
    host?: string;
    port?: number;
    database?: string;
    connectionString?: string;
    ssl?: any;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  }

  export class Pool extends EventEmitter {
    constructor(config?: PoolConfig);
    connect(): Promise<PoolClient>;
    query: (text: string, params?: any[]) => Promise<QueryResult>;
    end(): Promise<void>;
  }

  export interface PoolClient {
    query: (text: string, params?: any[]) => Promise<QueryResult>;
    release: () => void;
  }

  export interface QueryResult<R = any> {
    rows: R[];
    rowCount: number;
  }
}
