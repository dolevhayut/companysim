import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const client=new Client({name:'companysim-example',version:'1'});
try{await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:4545/mcp')));console.log(await client.callTool({name:'search_company',arguments:{query:'Atlas'}}));}finally{await client.close();}
