import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

// https://astro.build/config
export default defineConfig({
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
