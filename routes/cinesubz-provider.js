const {Router}=require('express');
const router=Router();
const BASE='https://api-dark-shan-yt.koyeb.app';
const endpoints={
 search:'/movie/cinesubz-search',
 movie:'/movie/cinesubz-info',
 tv:'/tv/cinesubz-info',
 episode:'/episode/cinesubz-info',
 download:'/movie/cinesubz-download'
};
router.get('/:action',async(req,res)=>{
 const path=endpoints[req.params.action];
 if(!path)return res.status(404).json({ok:false,error:'Unknown CineSubz action'});
 const upstream=new URL(path,BASE);
 for(const [key,value] of Object.entries(req.query)){
   if(!['q','query','url','id','link','quality','season','episode','text'].includes(key)||typeof value!=='string'||value.length>2000)continue;
   upstream.searchParams.set(key,value);
 }
 if(req.params.action==='download'&&!upstream.searchParams.has('text')){
   const candidate=req.query.url||req.query.link||req.query.q||req.query.query;
   if(typeof candidate==='string'&&candidate.trim())upstream.searchParams.set('text',candidate.trim());
 }
 if(req.params.action==='download'&&!upstream.searchParams.has('text'))return res.status(400).json({ok:false,error:'text is required',example:'/api/provider/cinesubz/download?text=YOUR_MOVIE_OR_DOWNLOAD_URL'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 const providerKey=process.env.CINESUBZ_API_KEY;
 if(providerKey)upstream.searchParams.set('apikey',providerKey);
 try{
   const headers={'Accept':'application/json'};
   // Provider credentials should only be sent if its documented auth scheme is configured.
   if(process.env.CINESUBZ_PROVIDER_AUTH_HEADER && process.env.CINESUBZ_PROVIDER_AUTH_VALUE){
     const header=process.env.CINESUBZ_PROVIDER_AUTH_HEADER;
     if(!/^(x-api-key|authorization)$/i.test(header))throw Error('Invalid provider auth header');
     headers[header]=process.env.CINESUBZ_PROVIDER_AUTH_VALUE;
   }
   const response=await fetch(upstream,{headers,signal:controller.signal,redirect:'error'});
   const raw=await response.text();
   let data;try{data=JSON.parse(raw)}catch{return res.status(502).json({ok:false,error:'Provider did not return JSON',status:response.status})}
   res.status(response.ok?200:502).json({ok:response.ok,providerStatus:response.status,data});
 }catch(e){res.status(502).json({ok:false,error:e.name==='AbortError'?'Provider timeout':'Provider request failed'})}
 finally{clearTimeout(timer)}
});
module.exports=router;
