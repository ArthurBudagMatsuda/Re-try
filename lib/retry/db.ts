import {env} from 'cloudflare:workers';
export function database():D1Database{if(!env.DB)throw new Error('Persistent storage unavailable');return env.DB}
