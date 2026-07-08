const MAX_BYTES = 2 * 1024 * 1024;
const BLOCKED_HOSTS = new Set(['localhost','metadata.google.internal','169.254.169.254','100.100.100.200']);
function isPrivateIp(value: string): boolean {
  const host=value.replace(/^\[|\]$/g,'').toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost')) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || host==='0.0.0.0') return true;
  const match=host.match(/^172\.(\d+)\./); if(match && Number(match[1])>=16 && Number(match[1])<=31) return true;
  if (host==='::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return true;
  return false;
}
async function assertDnsPublic(hostname: string): Promise<void> {
  if (isPrivateIp(hostname)) throw new Error('URL nội bộ hoặc private IP bị chặn.');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) return;
  const results = await Promise.allSettled([Deno.resolveDns(hostname,'A'),Deno.resolveDns(hostname,'AAAA')]);
  const addresses=results.flatMap((result)=>result.status==='fulfilled'?result.value:[]);
  if (!addresses.length) throw new Error('Không phân giải được tên miền.');
  if (addresses.some(isPrivateIp)) throw new Error('Tên miền trỏ đến IP nội bộ nên đã bị chặn.');
}
export async function assertSafeUrl(input:string):Promise<URL>{
  let url:URL; try{url=new URL(input);}catch{throw new Error('URL không hợp lệ.');}
  if(!['http:','https:'].includes(url.protocol))throw new Error('Chỉ chấp nhận HTTP hoặc HTTPS.');
  if(url.username||url.password)throw new Error('URL không được chứa tài khoản hoặc mật khẩu.');
  await assertDnsPublic(url.hostname); return url;
}
export async function fetchSafe(input:string, allowedContentTypes:string[], redirects=0):Promise<{url:string;contentType:string;body:string;status:number}>{
  if(redirects>3)throw new Error('Nguồn chuyển hướng quá 3 lần.');
  const url=await assertSafeUrl(input);
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10_000);
  let response:Response;
  try{response=await fetch(url,{redirect:'manual',signal:controller.signal,headers:{'User-Agent':'TinNhanhCaNhan/1.0 (+RSS reader)','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8'}});}catch(error){if((error as Error).name==='AbortError')throw new Error('Nguồn phản hồi quá 10 giây.');throw new Error(`Không thể kết nối nguồn: ${(error as Error).message}`);}finally{clearTimeout(timer);}
  if([301,302,303,307,308].includes(response.status)){
    const location=response.headers.get('location'); if(!location)throw new Error('Nguồn chuyển hướng nhưng thiếu địa chỉ đích.');
    return fetchSafe(new URL(location,url).toString(),allowedContentTypes,redirects+1);
  }
  if(!response.ok){const messages:Record<number,string>={403:'Nguồn từ chối truy cập (403).',404:'Không tìm thấy RSS (404).',429:'Nguồn giới hạn quá nhiều yêu cầu (429).',500:'Máy chủ nguồn đang lỗi (500).'};throw new Error(messages[response.status]??`Nguồn trả về HTTP ${response.status}.`);}
  const contentType=(response.headers.get('content-type')??'').toLowerCase();
  if(allowedContentTypes.length && !allowedContentTypes.some((type)=>contentType.includes(type))) throw new Error(`Định dạng phản hồi không được chấp nhận: ${contentType||'không xác định'}.`);
  const reader=response.body?.getReader(); if(!reader)throw new Error('Nguồn không có nội dung.');
  const chunks:Uint8Array[]=[]; let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;if(value){total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel();throw new Error('Phản hồi vượt quá giới hạn 2 MB.');}chunks.push(value);}}
  const all=new Uint8Array(total);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}
  let body='';
  try{body=new TextDecoder('utf-8',{fatal:true}).decode(all);}catch{body=new TextDecoder('windows-1252').decode(all);}
  return {url:response.url||url.toString(),contentType,body,status:response.status};
}
