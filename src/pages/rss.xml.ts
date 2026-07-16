import { siteConfig } from '../data/site.config'
import rss from '@astrojs/rss'
import { getPosts } from '@/utils'

export async function GET() {
	const posts = await getPosts()
	return rss({
		title: siteConfig.title,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			link: `post/${post.slug}/`
		}))
	})
}
