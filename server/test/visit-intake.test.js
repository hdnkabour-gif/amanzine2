'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {localExtract,sanitize,understandVisit}=require('../lib/visit-intake');

test('local field visit detects commerce without inventing business data',()=>{
 const result=localExtract('عندي محل لافاج');
 assert.equal(result.business_kind,'shop');
 assert.equal(result.location_city,'');
 assert.equal(result.source,'local');
});
test('external extractor output is constrained and asks at most 3 followups',()=>{
 const x=sanitize({business_kind:'root-admin',location_city:'Casablanca',visitor_need:'',foo:'inject'},localExtract('test'));
 assert.equal(x.business_kind,'unknown');
 assert.equal(x.location_city,'Casablanca');
 assert.ok(x.questions.length<=3);
 assert.equal(x.foo,undefined);
});
test('external AI is disabled by default even with arbitrary text',async()=>{
 const r=await understandVisit('بغيت مساعد لفهم نشاط المحل');
 assert.equal(r.source,'local');
 assert.equal(r.business_activity,'');
});
