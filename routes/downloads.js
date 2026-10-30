const {Router}=require('express');
const {load,safeUrl,downloadLinks,wrap}=require('../services/movie');
const router=Router();
router.get('/',wrap(async(req,res)=>{
  if(!req.query.url)return res.status(400).json({ok:false,error:'url required'});
  let url;
  try{url=safeUrl(req.query.url)}catch(e){return res.status(400).json({ok:false,error:e.message})}
  const links=downloadLinks(await load(url));
  res.json({ok:true,source:url,count:links.length,links,note:'Publicly exposed download-page URLs only. No paywall, CAPTCHA or shortlink bypass; direct media URLs are not verified.'});
}));
module.exports=router;
