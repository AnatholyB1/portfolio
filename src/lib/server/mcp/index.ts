// SDK MCP (@modelcontextprotocol/sdk 1.32.1), faits confirmes dans node_modules :
// - Serveur : import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
// - Transport Web Standard (Request -> Response), sans session :
//   import { WebStandardStreamableHTTPServerTransport }
//     from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
//   new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
//   puis `await server.connect(transport); return transport.handleRequest(request)`.
//   Option utile : enableJsonResponse (JSON au lieu de SSE). Un transport stateless
//   ne se reutilise pas : un McpServer + un transport par requete.
// - server.registerTool(name, { description, inputSchema }, cb) : inputSchema accepte une
//   forme brute zod (Record<string, schema>) OU un schema objet ; zod ^3.25 || ^4 supporte
//   (peer dep), donc zod 4 du repo OK sans import de compat. cb(args, extra).
export {};
