import {createClient,type Client,type InValue} from '@libsql/client';
let client:Client|undefined;
export function databaseClient(){
 if(!client){
  const url=process.env.DATABASE_URL?.trim();
  if(!url)throw new Error('Persistent storage unavailable. Configure DATABASE_URL.');
  if(process.env.VERCEL==='1'&&(url.startsWith('file:')||url===':memory:'))throw new Error('Persistent storage unavailable. Vercel requires a remote database.');
  client=createClient({url,authToken:process.env.DATABASE_AUTH_TOKEN||undefined});
 }
 return client;
}
// Preserve the existing parameterized SQLite queries and lifecycle semantics.
class Statement{
 constructor(private sql:string,private args:InValue[]=[]){ }
 bind(...args:InValue[]){return new Statement(this.sql,args)}
 private async execute(){try{return await databaseClient().execute({sql:this.sql,args:this.args})}catch{throw new Error('Persistent storage unavailable')}}
 async first<T=Record<string,unknown>>(){return ((await this.execute()).rows[0] as unknown as T)??null}
 async all<T=Record<string,unknown>>(){return {results:(await this.execute()).rows as unknown as T[]}}
 async run(){return {meta:{changes:(await this.execute()).rowsAffected}}}
}
export function database(){return {prepare:(sql:string)=>new Statement(sql)}}
