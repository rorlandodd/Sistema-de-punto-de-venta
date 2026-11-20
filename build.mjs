import {build} from 'esbuild';
import fs from 'node:fs';
await build({entryPoints:['src/client.tsx'],bundle:true,outfile:'dist/public/app.js',minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked'});
for(const name of ['server','install'])await build({entryPoints:['src/'+name+'.ts'],bundle:true,outfile:'dist/'+name+'.cjs',platform:'node',target:'node24',format:'cjs',legalComments:'linked'});
fs.copyFileSync('src/index.html','dist/public/index.html');
