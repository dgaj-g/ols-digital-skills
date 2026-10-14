/* usage: node ks3-dt/tools/record-tutorial/l6-server-live-test.js ks3-dt/platform/server/PathB_Code.gs — runs the server's pingLive_ and sweepRooms_ against the REAL live project through a curl shim; control: a wrong address must fail the ping. */
const fs=require('fs'),cp=require('child_process');
const props={};
global.PropertiesService={getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v}})};
global.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
global.UrlFetchApp={fetch:(url,o)=>{const a=['-s','-o','/dev/stderr','-w','%{http_code}','-X',o.method.toUpperCase(),url];if(o.payload)a.push('-d',o.payload);const r=cp.spawnSync('curl',a,{encoding:'utf8'});return{getResponseCode:()=>+r.stdout,getContentText:()=>r.stderr}}};
global.Logger={log:console.log};
const src=fs.readFileSync(process.argv[2],'utf8');
const f=new Function(src+';return {pingLive_,sweepRooms_,liveRoom_,liveFetch_,tmin_};');const S=f();
console.log('ping',JSON.stringify(S.pingLive_()));
const r1=S.liveRoom_(); S.liveFetch_('rooms/'+r1+'/A/x','put',{j:'h|A|0',t:Date.now()});
const r2=S.liveRoom_(); S.liveFetch_('rooms/'+r2+'/A/x','put',{j:'h|A|0',t:Date.now()});
const L=JSON.parse(props.LIVE_ROOMS); L[0][1]-=400; props.LIVE_ROOMS=JSON.stringify(L);
console.log('sweep',JSON.stringify(S.sweepRooms_()));
console.log('old room after sweep',S.liveFetch_('rooms/'+r1,'get').text,'· new room kept',S.liveFetch_('rooms/'+r2,'get').text.slice(0,30));
S.liveFetch_('rooms/'+r2,'delete');
/* control: a dead database address must make the ping fail */
const g=new Function(src.replace(/var LIVE_DB = '[^']+'/,"var LIVE_DB = 'https://ols-ks3-dt-live-nope.europe-west1.firebasedatabase.app'")+';return {pingLive_};')();
console.log('CONTROL ping on a wrong address',JSON.stringify(g.pingLive_()));
