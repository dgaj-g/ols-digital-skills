// Builds the self-contained art test (art.js + font inlined) into L5_PROTOTYPES and shoots it at 683 wide.
const fs=require('fs'),path=require('path');
const R=path.join(__dirname,'../../..'),OUT=path.join(process.env.HOME,'Desktop/Claude Work/KS3 DT Platform/L5_PROTOTYPES');
const font='data:font/woff2;base64,'+fs.readFileSync(path.join(R,'platform/assets/rescue/rescue/fonts/space-grotesk.woff2')).toString('base64');
let h=fs.readFileSync(path.join(__dirname,'art-test-src.html'),'utf8');
if(process.env.CONTROL) h=h.replace(/'cheer'/g,"'calm'").replace('{awake:1,smile:1,t:T}','{awake:1,smile:0,t:T}'); // CONTROL: flat 'cheer' and 'smile' faces must be judged not readable
h=h.replace('FONTURL',font).replace('ARTJS',()=>fs.readFileSync(path.join(R,'platform/assets/twolights/art.js'),'utf8'));
const name=process.env.CONTROL?'twolights-art-test-control.html':'twolights-art-test.html';
fs.writeFileSync(path.join(OUT,name),h);
(async()=>{const {chromium}=require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');const b=await chromium.launch();const pg=await b.newPage({viewport:{width:683,height:800}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+path.join(OUT,name));await new Promise(r=>setTimeout(r,500));
await pg.screenshot({path:path.join(OUT,name.replace('.html','.png')),fullPage:true});await b.close();
console.log('wrote',name,errs.length?'ERRORS '+errs.join('|'):'no errors');})();
