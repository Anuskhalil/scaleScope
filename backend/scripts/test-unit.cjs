const path = require('node:path');
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const env = {};
const allowed = new Set(['path','systemroot','windir','comspec','temp','tmp','home','userprofile','localappdata']);
for (const [key,value] of Object.entries(process.env)) {
 if (allowed.has(key.toLowerCase())) env[key] = value;
}
env.NODE_ENV = 'test';
const tests = fs.readdirSync(path.join(root,'test')).filter(name=>name.endsWith('.test.cjs')).sort().map(name=>path.join(root,'test',name));
const result = spawnSync(process.execPath,['--require',path.join(__dirname,'unit-test-preload.cjs'),'--test',...tests],{cwd:root,env,stdio:'inherit'});
if(result.error) { console.error('Unit-test process could not start'); process.exitCode=1; }
else process.exitCode=result.status??1;

