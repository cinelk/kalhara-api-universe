const cheerio = require('cheerio');
const BASE='https://cinesubz.net';
const clean = value => String(value ?? '').replace(/\s+/g,' ').trim();
function safeUrl(raw){const url=new URL(String(raw),BASE);if(url.protocol!=='https:'||!['cinesubz.lk','www.cinesubz.lk','cinesubz.net','www.cinesubz.net'].includes(url.hostname)||url.username||url.password)throw new Error('Only CineSubz HTTPS URLs allowed');return url.href;}
function absoluteUrl(raw){if(!raw||/^data:/i.test(raw))return null;try{return new URL(raw,BASE).href}catch{return null}}
async function load(raw){
  let target=safeUrl(raw);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    for(let hop=0;hop<6;hop++){
      const r=await fetch(target,{
        signal:controller.signal,
        redirect:'manual',
        headers:{
          'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language':'en-US,en;q=0.9'
        }
      });
      if([301,302,303,307,308].includes(r.status)){
        const location=r.headers.get('location');
        if(!location)throw new Error('Upstream redirect missing Location header');
        const next=new URL(location,target);
        // Never follow redirects to third-party hosts, private IPs or non-HTTPS URLs.
        if(next.protocol!=='https:'||!['cinesubz.lk','www.cinesubz.lk','cinesubz.net','www.cinesubz.net'].includes(next.hostname)||next.username||next.password)
          throw new Error('Upstream redirected outside allowed CineSubz hosts: '+next.hostname);
        target=next.href;
        continue;
      }
      if(!r.ok)throw new Error('Upstream HTTP '+r.status+' at '+new URL(target).pathname);
      const html=await r.text();
      if(/<title>[^<]*(just a moment|attention required|access denied)/i.test(html))
        throw new Error('Upstream security challenge; normal HTML unavailable');
      return cheerio.load(html);
    }
    throw new Error('Upstream redirect loop (more than 5 redirects)');
  }finally{clearTimeout(timer)}
}
function cards($){const found=[],seen=new Set();$('a[href*="/movies/"],a[href*="/tvshows/"]').each((_,el)=>{const a=$(el);let url;try{url=safeUrl(a.attr('href'))}catch{return}if(!/^\/(movies|tvshows)\/[^/]+\/?$/.test(new URL(url).pathname)||seen.has(url))return;let card=a;for(let i=0;i<4;i++){const parent=card.parent();if(!parent.length||parent.find('a[href*="/movies/"],a[href*="/tvshows/"]').length>3)break;card=parent;if(card.find('.mli-thumb,.imdb-score,.badge-quality-corner').length)break;}const img=card.find('img.mli-thumb,img').first();const title=clean(a.attr('title')||card.find('a.play4').attr('title')||img.attr('alt')||card.find('.mli-info,.title').first().text());if(!title)return;seen.add(url);found.push({title,url,type:url.includes('/tvshows/')?'series':'movie',poster:absoluteUrl(img.attr('data-src')||img.attr('data-lazy-src')||img.attr('src')),imdb:clean(card.find('.imdb-score').first().text())||null,quality:clean(card.find('.badge-quality-corner,.data-quality').first().text())||null});});return found;}
function filteredSearch(items,q){const terms=clean(q).toLowerCase().split(/\s+/).filter(Boolean);return items.filter(x=>terms.every(t=>clean(x.title).toLowerCase().includes(t)));}
function episodeList($){const seasons=[];$('.episodes-list').each((_,el)=>{const ul=$(el);const season=Number(ul.attr('data-season')||ul.attr('id')?.match(/\d+$/)?.[0]||1);const episodes=ul.find('a.episode-link,li a[href*="/episodes/"]').map((_,node)=>{const a=$(node);return {episode:Number(a.attr('data-episode')||clean(a.find('.ep-num').text()))||null,title:clean(a.find('.ep-title').text()),date:clean(a.find('.ep-date').text()),thumbnail:absoluteUrl(a.find('img').attr('data-src')||a.find('img').attr('src')),url:absoluteUrl(a.attr('href'))}}).get();if(episodes.length)seasons.push({season,count:episodes.length,episodes});});return seasons;}
function qualities($){return $('.download-link-item,.movie-download-link-item').map((_,el)=>{const label=clean($(el).find('.download-meta,.movie-download-meta').text());if(!label)return null;const parts=label.split('•').map(clean);return {label,resolution:label.match(/\b(?:480p|720p|1080p|2160p|4K)\b/i)?.[0]||null,size:label.match(/\b\d+(?:\.\d+)?\s*(?:MB|GB|KB|TB)\b/i)?.[0]||null,source:parts[0].replace(/\b(?:480p|720p|1080p|2160p|4K)\b/i,'').trim(),language:parts.at(-1)||null};}).get();}
function details($,url){const type=url.includes('/episodes/')?'episode':url.includes('/tvshows/')?'series':'movie';const result={type,title:clean($('.details-title h3').first().text()||$('h1').first().text()),url,poster:absoluteUrl($('.poster-img').attr('src')||$('meta[itemprop="image"]').attr('content')),imdb:clean($('.data-imdb').first().text())||null,rating:clean($('[itemprop="ratingValue"]').first().text())||null,year:clean($('.details-info a[href*="/release/"]').first().text())||null,genres:$('.details-genre a').map((_,a)=>clean($(a).text())).get(),description:clean($('.details-desc').text()),cast:$('.zt-cast-card').map((_,e)=>({name:clean($(e).find('.zt-cast-name').text()),role:clean($(e).find('.zt-cast-role').text())})).get(),seasons:episodeList($),qualities:qualities($)};if(type==='episode'){result.episodeTitle=clean($('.details-info p').filter((_,p)=>$(p).text().includes('Episode Title:')).first().find('a').text());result.players=$('.zetaflix_player_option .opt-name').map((_,e)=>clean($(e).text())).get();}return result;}
const wrap=fn=>(req,res)=>Promise.resolve().then(()=>fn(req,res)).catch(err=>res.status(502).json({ok:false,error:err.message}));
const detail=wrap(async(req,res)=>{if(!req.query.url)return res.status(400).json({ok:false,error:'url required'});const url=safeUrl(req.query.url);res.json({ok:true,result:details(await load(url),url)});});
module.exports={BASE,clean,safeUrl,load,cards,filteredSearch,episodeList,details,wrap,detail};
