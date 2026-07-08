import { corsHeaders } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';
import { fetchSafe } from '../_shared/security.ts';
import { parseFeed } from '../_shared/feed.ts';
import { errorResponse, json } from '../_shared/response.ts';
const COMMON=['/rss','/rss.xml','/feed','/feed.xml','/atom.xml','/rss/home.rss','/rss/tin-moi-nhat.rss'];
function candidatesFromHtml(html:string,base:string):string[]{const urls=[...html.matchAll(/<link\b[^>]*rel=["'][^"']*alternate[^"']*["'][^>]*>/gi)].map((m)=>m[0]).filter((tag)=>/(application\/(rss\+xml|atom\+xml)|text\/xml)/i.test(tag)).map((tag)=>tag.match(/href=["']([^"']+)["']/i)?.[1]).filter((x):x is string=>Boolean(x)).map((x)=>new URL(x,base).toString());return [...new Set(urls)];}
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Chỉ hỗ trợ POST.'},405);
  try{await authenticate(req);const body=await req.json() as {url?:string};if(!body.url)throw new Error('Thiếu URL website hoặc RSS.');const first=await fetchSafe(body.url,['xml','rss','atom','html','text/plain']);
    try{const feed=parseFeed(first.body,first.url);return json({feeds:[{url:first.url,valid:true,feedName:feed.name,websiteUrl:feed.websiteUrl,itemCount:feed.items.length,newestDate:feed.newestDate,hasImage:feed.hasImage,format:feed.format}]});}catch{/* tiếp tục nếu là HTML */}
    if(!first.contentType.includes('html')&&!/<html/i.test(first.body))throw new Error('URL không phải RSS và cũng không phải trang HTML có thể dò feed.');
    const base=new URL(first.url);const candidates=[...candidatesFromHtml(first.body,first.url),...COMMON.map((path)=>new URL(path,base.origin).toString())];const feeds=[];
    for(const url of [...new Set(candidates)].slice(0,12)){try{const response=await fetchSafe(url,['xml','rss','atom','text/plain']);const feed=parseFeed(response.body,response.url);feeds.push({url:response.url,valid:true,feedName:feed.name,websiteUrl:feed.websiteUrl,itemCount:feed.items.length,newestDate:feed.newestDate,hasImage:feed.hasImage,format:feed.format});}catch{/* bỏ ứng viên lỗi */}}
    return json({feeds});
  }catch(error){return errorResponse(error);}
});
