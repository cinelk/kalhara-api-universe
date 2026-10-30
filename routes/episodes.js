const {Router}=require('express');const r=Router();r.get('/info',require('../services/movie').detail);module.exports=r;
