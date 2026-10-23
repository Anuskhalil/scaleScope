import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRequest} from './reviewRequest.js';
const session=token=>({data:{session:{access_token:token}}});
test('review request refreshes once after 401 and uses the new token',async()=>{
 const sent=[];let refreshed=0;
 const auth={getSession:async()=>session('old'),refreshSession:async()=>{refreshed++;return session('new');}};
 const result=await reviewRequest(auth,async(url,options)=>{sent.push(options.headers.Authorization);return sent.length===1?new Response('{}',{status:401}):new Response(JSON.stringify({data:{review:{status:'approved'}}}));},'http://test/me');
 assert.equal(refreshed,1);assert.deepEqual(sent,['Bearer old','Bearer new']);assert.equal(result.review.status,'approved');
});
test('repeated 401 stops and never grants access',async()=>{
 let requests=0;
 await assert.rejects(reviewRequest({getSession:async()=>session('old'),refreshSession:async()=>session('new')},async()=>{requests++;return new Response('{}',{status:401});},'http://test/me'),/sign in again/);
 assert.equal(requests,2);
});
test('rate limit is not retried or mistaken for pending review',async()=>{
 await assert.rejects(reviewRequest({getSession:async()=>session('old'),refreshSession:()=>{throw Error('Unexpected refresh');}},async()=>new Response('{}',{status:429}),'http://test/me'),/Too many requests/);
});
