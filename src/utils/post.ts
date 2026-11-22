import { getCollection } from 'astro:content'

export const getPosts = async (max?: number) => {
	return (await getCollection('blog'))
		.filter((post) => !post.data.draft)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
		.slice(0, max)
}

export const getSnippets = async () => {
	return (
		(await getCollection('snippets'))
			// Drafts show in `astro dev` for review, never in the built site
			.filter((snippet) => import.meta.env.DEV || !snippet.data.draft)
			.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
	)
}
