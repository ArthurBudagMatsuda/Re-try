import nextEnv from '@next/env';
import {createClient} from '@libsql/client';
import {drizzle} from 'drizzle-orm/libsql';
import {migrate} from 'drizzle-orm/libsql/migrator';
nextEnv.loadEnvConfig(process.cwd());
const url=process.env.DATABASE_URL;if(!url)throw new Error('Set DATABASE_URL in .env or the server environment.');
if(process.env.VERCEL==='1'&&(url.startsWith('file:')||url===':memory:'))throw new Error('Vercel requires a remote database.');
const client=createClient({url,authToken:process.env.DATABASE_AUTH_TOKEN||undefined});
try{await migrate(drizzle(client),{migrationsFolder:'drizzle'});console.log('Database migrations applied.')}finally{client.close()}
