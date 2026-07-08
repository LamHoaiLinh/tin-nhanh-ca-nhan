import { XMLParser } from 'npm:fast-xml-parser@5.3.3';
import { stripHtml } from './algorithms.ts';

export interface ParsedItem { guid:string|null;title:string;description:string;link:string;author:string|null;category:string|null;publishedAt:string;imageUrl:string|null; }
export interface ParsedFeed { name:string;websiteUrl:string|null;format:'RSS 2.0'|'Atom'|'RDF'|'Unknown';items:ParsedItem[];hasImage:boolean;newestDate:string|null; }
const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',textNodeName:'#text',parseTagValue:false,trimValues:true,removeNSPrefix:false});
function arr<T>(v:T|T[]|undefined|null):T[]{return v==null?[]:Array.isArray(v)?v:[v];}
function text(v:unknown):string{
  if(v==null)return '';
  if(typeof v==='string'||typeof v==='number')return String(v);
  if(Array.isArray(v))return v.map(text).find(Boolean)??'';
  if(typeof v==='object'){const r=v as Record<string,unknown>;return text(r['#text']??r['_']??r['content']??r['value']);}
  return '';
}
function href(v:unknown):string{
  if(typeof v==='string')return v;
  if(Array.isArray(v)){const preferred=v.find((x)=>typeof x==='object'&&((x as Record<string,unknown>)['@_rel']==='alternate'||!(x as Record<string,unknown>)['@_rel']));return href(preferred??v[0]);}
  if(v&&typeof v==='object'){const r=v as Record<string,unknown>;return String(r['@_href']??r['href']??r['@_url']??r['url']??r['#text']??'');}
  return '';
}
function validDate(...values:unknown[]):string{
  for(const value of values){const raw=text(value);if(!raw)continue;const date=new Date(raw);if(!Number.isNaN(date.getTime()))return date.toISOString();}
  return new Date().toISOString();
}
function absolutize(value:string,baseUrl:string):string{try{return new URL(value,baseUrl).toString();}catch{return '';}}
function imageFrom(value:unknown,baseUrl:string):string|null{
  if(!value)return null;
  for(const item of arr(value)){
    if(typeof item==='string'&&/^https?:\/\//i.test(item))return item;
    if(item&&typeof item==='object'){
      const r=item as Record<string,unknown>;
      const type=String(r['@_type']??r['type']??'');
      const raw=String(r['@_url']??r['url']??r['@_href']??r['href']??'');
      if(raw&&(!type||type.startsWith('image/')))return absolutize(raw,baseUrl);
    }
  }
  return null;
}
function imageInHtml(html:string,baseUrl:string):string|null{const match=html.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);return match?.[1]?absolutize(match[1],baseUrl):null;}
function pickImage(item:Record<string,unknown>,baseUrl:string):string|null{
  return imageFrom(item['media:content'],baseUrl)??imageFrom(item['media:thumbnail'],baseUrl)??imageFrom(item['enclosure'],baseUrl)??imageInHtml(text(item['content:encoded']??item['content']),baseUrl)??imageInHtml(text(item['description']??item['summary']),baseUrl);
}
function parseRss(root:Record<string,unknown>,baseUrl:string):ParsedFeed{
  const channel=((root.rss as Record<string,unknown>)?.channel??root.channel??{}) as Record<string,unknown>;
  const items=arr(channel.item as Record<string,unknown>|Record<string,unknown>[]).slice(0,200).map((item):ParsedItem=>{
    const link=absolutize(text(item.link)||href(item.link),baseUrl);const descriptionRaw=text(item['content:encoded']??item.description);
    return{guid:text(item.guid)||link||null,title:stripHtml(text(item.title)),description:stripHtml(descriptionRaw).slice(0,1200),link,author:stripHtml(text(item.author??item['dc:creator']))||null,category:stripHtml(text(item.category))||null,publishedAt:validDate(item.pubDate,item['dc:date'],item.date),imageUrl:pickImage(item,baseUrl)};
  }).filter((item)=>item.title&&item.link);
  const newest=items.map(x=>x.publishedAt).sort().at(-1)??null;
  return{name:stripHtml(text(channel.title))||new URL(baseUrl).hostname,websiteUrl:absolutize(text(channel.link),baseUrl)||null,format:String((root.rss as Record<string,unknown>)?.['@_version']??'').startsWith('2')?'RSS 2.0':'RSS 2.0',items,hasImage:items.some(x=>Boolean(x.imageUrl)),newestDate:newest};
}
function parseAtom(root:Record<string,unknown>,baseUrl:string):ParsedFeed{
  const feed=(root.feed??root['atom:feed']) as Record<string,unknown>;
  const items=arr(feed.entry as Record<string,unknown>|Record<string,unknown>[]).slice(0,200).map((item):ParsedItem=>{
    const link=absolutize(href(item.link),baseUrl);const descriptionRaw=text(item.summary??item.content);
    return{guid:text(item.id)||link||null,title:stripHtml(text(item.title)),description:stripHtml(descriptionRaw).slice(0,1200),link,author:stripHtml(text((item.author as Record<string,unknown>)?.name??item.author))||null,category:stripHtml(text((arr(item.category)[0] as Record<string,unknown>)?.['@_term']??item.category))||null,publishedAt:validDate(item.published,item.updated),imageUrl:pickImage(item,baseUrl)};
  }).filter((item)=>item.title&&item.link);
  const siteLinks=arr(feed.link);const website=siteLinks.map(href).find(Boolean);
  return{name:stripHtml(text(feed.title))||new URL(baseUrl).hostname,websiteUrl:website?absolutize(website,baseUrl):null,format:'Atom',items,hasImage:items.some(x=>Boolean(x.imageUrl)),newestDate:items.map(x=>x.publishedAt).sort().at(-1)??null};
}
function parseRdf(root:Record<string,unknown>,baseUrl:string):ParsedFeed{
  const rdf=(root['rdf:RDF']??root.RDF) as Record<string,unknown>;const channel=(rdf.channel??{}) as Record<string,unknown>;
  const items=arr(rdf.item as Record<string,unknown>|Record<string,unknown>[]).slice(0,200).map((item):ParsedItem=>{const link=absolutize(text(item.link),baseUrl);return{guid:text(item['@_rdf:about'])||link||null,title:stripHtml(text(item.title)),description:stripHtml(text(item.description)).slice(0,1200),link,author:stripHtml(text(item['dc:creator']))||null,category:stripHtml(text(item['dc:subject']))||null,publishedAt:validDate(item['dc:date']),imageUrl:pickImage(item,baseUrl)};}).filter(x=>x.title&&x.link);
  return{name:stripHtml(text(channel.title))||new URL(baseUrl).hostname,websiteUrl:absolutize(text(channel.link),baseUrl)||null,format:'RDF',items,hasImage:items.some(x=>Boolean(x.imageUrl)),newestDate:items.map(x=>x.publishedAt).sort().at(-1)??null};
}
export function parseFeed(xml:string,baseUrl:string):ParsedFeed{
  if(!xml.trim().startsWith('<'))throw new Error('Nội dung không phải XML.');
  let root:Record<string,unknown>;try{root=parser.parse(xml) as Record<string,unknown>;}catch{throw new Error('RSS XML bị lỗi hoặc không thể phân tích.');}
  if(root.rss||root.channel)return parseRss(root,baseUrl);
  if(root.feed||root['atom:feed'])return parseAtom(root,baseUrl);
  if(root['rdf:RDF']||root.RDF)return parseRdf(root,baseUrl);
  throw new Error('Không nhận diện được RSS 2.0, Atom hoặc RDF.');
}
