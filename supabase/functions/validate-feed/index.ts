import { corsHeaders } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';
import { fetchSafe } from '../_shared/security.ts';
import { parseFeed } from '../_shared/feed.ts';
import { errorResponse, json } from '../_shared/response.ts';
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Chỉ hỗ trợ POST.'},405);
  try{await authenticate(req);const body=await req.json() as {url?:string};if(!body.url)throw new Error('Thiếu URL cần kiểm tra.');const response=await fetchSafe(body.url,['xml','rss','atom','text/plain']);const feed=parseFeed(response.body,response.url);return json({valid:true,feedName:feed.name,websiteUrl:feed.websiteUrl,itemCount:feed.items.length,newestDate:feed.newestDate,hasImage:feed.hasImage,format:feed.format});}catch(error){return errorResponse(error);}
});
