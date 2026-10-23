import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// Ignore all project .env files and the production/default Vite config.
const server=await createServer({configFile:false,envDir:false,plugins:[tailwindcss(),react()],server:{host:'127.0.0.1',port:5174,strictPort:false}});
await server.listen();
console.log('STAGING ONLY: sopklyxvzmungxwgboqs; production env files disabled');
server.printUrls();
