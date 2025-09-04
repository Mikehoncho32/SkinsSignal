import {Pool} from "pg"; import type {PoolClient} from "pg"; import {getEnv} from "@/lib/env";
declare global{var __pgPool__:Pool|undefined}
export function getPool(){ if(!global.__pgPool__){ const env=getEnv(); process.env.NODE_TLS_REJECT_UNAUTHORIZED="0"; let cs=env.DATABASE_URL!; if(cs.startsWith("postgresql://")) cs="postgres://"+cs.slice("postgresql://".length); global.__pgPool__=new Pool({connectionString:cs, ssl:{require:true,rejectUnauthorized:false}, max:3, idleTimeoutMillis:30000, connectionTimeoutMillis:30000}); } return global.__pgPool__!; }
export async function withClient<T>(fn:(c:PoolClient)=>Promise<T>):Promise<T>{ const c=await getPool().connect(); try{return await fn(c)} finally{c.release()} }
