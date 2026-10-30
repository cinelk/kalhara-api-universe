const {Router}=require('express');const r=Router();r.get('/',require('../services/movie').detail);module.exports=r;
