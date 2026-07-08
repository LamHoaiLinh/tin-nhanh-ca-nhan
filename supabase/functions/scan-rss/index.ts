import { corsHeaders } from '../_shared/cors.ts';
import { authenticate } from '../_shared/auth.ts';
import { fetchSafe } from '../_shared/security.ts';
import { parseFeed, type ParsedItem } from '../_shared/feed.ts';
import { canonicalizeUrl, duplicateDecision, normalize, normalizeTitle, representativeScore, scoreArticle, sha256, simhash, type Candidate, type Rule } from '../_shared/algorithms.ts';
import { errorResponse, json } from '../_shared/response.ts';

type Admin = Awaited<ReturnType<typeof authenticate>>['admin'];
interface SourceRow { id:string;user_id:string;name:string;feed_url:string;website_url:string|null;logo_url:string|null;category:string;priority:number;enabled:boolean;last_scanned_at:string|null;consecutive_errors:number; }
interface ScanStats { received:number;inserted:number;duplicates:number; }
async function retryFetch(url:string){let last:unknown;for(let attempt=0;attempt<3;attempt++){try{return await fetchSafe(url,['xml','rss','atom','text/plain']);}catch(error){last=error;if(attempt<2)await new Promise((r)=>setTimeout(r,400*(attempt+1)));}}throw last;}
function validPublishedDate(value:string):string|null{const date=new Date(value);if(Number.isNaN(date.getTime()))return null;if(date.getTime()>Date.now()+24*3_600_000)return null;return date.toISOString();}
async function loadPreferences(admin:Admin,userId:string){const [{data:rules,error:ruleError},{data:categories,error:categoryError}]=await Promise.all([admin.from('keyword_rules').select('keyword,rule_type,target_field,weight,enabled').eq('user_id',userId).eq('enabled',true),admin.from('category_preferences').select('category,weight,enabled').eq('user_id',userId)]);if(ruleError)throw ruleError;if(categoryError)throw categoryError;return{rules:(rules??[]) as Rule[],categoryMap:new Map((categories??[]).map((x:{category:string;weight:number;enabled:boolean})=>[normalize(x.category),x.enabled?Number(x.weight):0]))};}
async function insertItem(admin:Admin,source:SourceRow,item:ParsedItem,rules:Rule[],categoryMap:Map<string,number>):Promise<'inserted'|'duplicate'|'skipped'>{
  if(!item.title||item.title.trim().length<8||!item.link)return 'skipped';
  const publishedAt=validPublishedDate(item.publishedAt);if(!publishedAt)return 'skipped';
  let canonicalUrl:string;try{canonicalUrl=canonicalizeUrl(item.link);}catch{return 'skipped';}
  const normalizedTitle=normalizeTitle(item.title);if(!normalizedTitle)return 'skipped';
  const [urlHash,titleHash]=await Promise.all([sha256(canonicalUrl),sha256(normalizedTitle)]);
  const itemSimhash=simhash(`${normalizedTitle} ${normalize(item.description)}`);
  let exact=admin.from('articles').select('id').eq('source_id',source.id).eq('url_hash',urlHash).limit(1);
  if(item.guid) exact=exact.or(`guid.eq.${item.guid},url_hash.eq.${urlHash}`);
  const {data:existing,error:existingError}=await exact;if(existingError)throw existingError;if(existing?.length)return 'skipped';
  const category=source.category||item.category||'Tin tổng hợp';const categoryWeight=categoryMap.get(normalize(category))??5;const imageUrl=item.imageUrl||source.logo_url;
  const scored=scoreArticle({title:item.title,description:item.description,category,sourcePriority:source.priority,publishedAt,imageUrl,author:item.author,url:canonicalUrl,categoryWeight,rules});
  const repScore=representativeScore({priority:source.priority,image:Boolean(imageUrl),descriptionLength:item.description.length,publishedAt,author:Boolean(item.author)});
  const candidateData:Candidate={guid:item.guid,source_id:source.id,canonical_url:canonicalUrl,url_hash:urlHash,normalized_title:normalizedTitle,title_hash:titleHash,simhash:itemSimhash,published_at:publishedAt};
  const since=new Date(Date.now()-7*86400_000).toISOString();
  const {data:recent,error:recentError}=await admin.from('articles').select('id,guid,source_id,canonical_url,url_hash,normalized_title,title_hash,simhash,published_at,duplicate_of,duplicate_count,representative_score,sources!inner(user_id)').eq('sources.user_id',source.user_id).gte('published_at',since).order('published_at',{ascending:false}).limit(300);if(recentError)throw recentError;
  const duplicate=(recent??[]).find((row:Record<string,unknown>)=>duplicateDecision(candidateData,row as unknown as Candidate)) as undefined|{id:string;duplicate_of:string|null;duplicate_count:number;representative_score:number};
  const payload={source_id:source.id,guid:item.guid,original_url:item.link,canonical_url:canonicalUrl,title:item.title,normalized_title:normalizedTitle,search_text:normalize(`${item.title} ${item.description}`),description:item.description,image_url:imageUrl,author:item.author,category,published_at:publishedAt,url_hash:urlHash,title_hash:titleHash,simhash:itemSimhash,relevance_score:scored.total,matched_keywords:scored.matchedKeywords,score_breakdown:scored.breakdown,representative_score:repScore};
  if(!duplicate){const {data:inserted,error}=await admin.from('articles').insert(payload).select('id').single();if(error){if(error.code==='23505')return 'skipped';throw error;}if(scored.hidden&&inserted)await admin.from('article_states').upsert({user_id:source.user_id,article_id:inserted.id,is_hidden:true},{onConflict:'user_id,article_id'});return 'inserted';}
  const rootId=duplicate.duplicate_of??duplicate.id;let root=duplicate;if(rootId!==duplicate.id){const {data}=await admin.from('articles').select('id,duplicate_count,representative_score').eq('id',rootId).single();if(data)root=data as typeof root;}
  if(repScore>Number(root.representative_score??0)){
    const {data:newRep,error}=await admin.from('articles').insert(payload).select('id').single();if(error){if(error.code==='23505')return 'skipped';throw error;}
    const {error:updateError}=await admin.from('articles').update({duplicate_of:newRep.id}).or(`id.eq.${rootId},duplicate_of.eq.${rootId}`);if(updateError)throw updateError;
    await admin.from('articles').update({duplicate_count:Number(root.duplicate_count??0)+1}).eq('id',newRep.id);
    if(scored.hidden)await admin.from('article_states').upsert({user_id:source.user_id,article_id:newRep.id,is_hidden:true},{onConflict:'user_id,article_id'});
  }else{
    const {data:inserted,error}=await admin.from('articles').insert({...payload,duplicate_of:rootId}).select('id').single();if(error){if(error.code==='23505')return 'skipped';throw error;}
    await admin.from('articles').update({duplicate_count:Number(root.duplicate_count??0)+1}).eq('id',rootId);
    if(scored.hidden&&inserted)await admin.from('article_states').upsert({user_id:source.user_id,article_id:inserted.id,is_hidden:true},{onConflict:'user_id,article_id'});
  }
  return 'duplicate';
}
async function scanOne(admin:Admin,source:SourceRow,manual:boolean):Promise<ScanStats>{
  if(manual&&source.last_scanned_at&&Date.now()-new Date(source.last_scanned_at).getTime()<30_000)throw new Error('Nguồn vừa được quét. Hãy chờ ít nhất 30 giây.');
  const {data:log,error:logError}=await admin.from('scan_logs').insert({source_id:source.id,status:'running'}).select('id').single();if(logError)throw logError;
  try{const [{rules,categoryMap},response]=await Promise.all([loadPreferences(admin,source.user_id),retryFetch(source.feed_url)]);const feed=parseFeed(response.body,response.url);let inserted=0,duplicates=0;for(const item of feed.items){const result=await insertItem(admin,source,item,rules,categoryMap);if(result==='inserted')inserted++;if(result==='duplicate')duplicates++;}
    await Promise.all([admin.from('scan_logs').update({completed_at:new Date().toISOString(),items_received:feed.items.length,items_inserted:inserted,duplicates_found:duplicates,status:'success'}).eq('id',log.id),admin.from('sources').update({last_scanned_at:new Date().toISOString(),last_success_at:new Date().toISOString(),last_status:'success',last_error:null,consecutive_errors:0,website_url:source.website_url||feed.websiteUrl}).eq('id',source.id)]);return{received:feed.items.length,inserted,duplicates};
  }catch(error){const message=error instanceof Error?error.message:'Lỗi không xác định';const failures=(source.consecutive_errors??0)+1;await Promise.all([admin.from('scan_logs').update({completed_at:new Date().toISOString(),status:'error',error_message:message}).eq('id',log.id),admin.from('sources').update({last_scanned_at:new Date().toISOString(),last_status:'error',last_error:message,consecutive_errors:failures,enabled:failures>=10?false:source.enabled}).eq('id',source.id)]);throw error;}
}
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});if(req.method!=='POST')return json({error:'Chỉ hỗ trợ POST.'},405);
  try{const caller=await authenticate(req);const body=await req.json().catch(()=>({})) as {sourceId?:string;all?:boolean};let query=caller.admin.from('sources').select('id,user_id,name,feed_url,website_url,logo_url,category,priority,enabled,last_scanned_at,consecutive_errors');if(caller.mode==='user')query=query.eq('user_id',caller.userId!);if(body.sourceId)query=query.eq('id',body.sourceId);else query=query.eq('enabled',true);const {data,error}=await query.order('last_scanned_at',{ascending:true,nullsFirst:true}).limit(caller.mode==='cron'?100:50);if(error)throw error;if(!data?.length)return json({scanned:0,inserted:0,duplicates:0,errors:0});let inserted=0,duplicates=0,errors=0;for(const source of data as SourceRow[]){try{const stats=await scanOne(caller.admin,source,caller.mode==='user');inserted+=stats.inserted;duplicates+=stats.duplicates;}catch{errors++;}}return json({scanned:data.length,inserted,duplicates,errors});}catch(error){return errorResponse(error);}
});
