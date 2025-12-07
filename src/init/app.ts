import { Hono } from 'hono';
import { RegExpRouter } from 'hono/router/reg-exp-router';
import { SmartRouter } from 'hono/router/smart-router';
import { TrieRouter } from 'hono/router/trie-router';

/**
 * Hono
 * Hono docs: https://hono.dev/docs/getting-started/bun
 */
const app = new Hono({
    router: new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
    }),
});

app.get('/', (c) => c.text('Hello Bun!'))

export default app;