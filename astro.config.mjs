import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

// Vercel serves api/*.js in production; mirror /api/quotes in `astro dev`
const quotesApiInDev = {
	name: 'quotes-api-in-dev',
	configureServer(server) {
		server.middlewares.use('/api/quotes', async (req, res) => {
			const { default: handler } = await server.ssrLoadModule('/api/quotes.js')
			await handler(req, res)
		})
	}
}

// https://astro.build/config
export default defineConfig({
	vite: { plugins: [quotesApiInDev] },
	site: 'https://rohanxg.vercel.app/',
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeKatex],
		shikiConfig: {
			theme: 'material-theme-palenight',
			wrap: true
		}
	},
	// MDX inherits the markdown config above (remark/rehype plugins, Shiki)
	integrations: [mdx(), sitemap()]
})
