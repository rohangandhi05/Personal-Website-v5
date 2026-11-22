import { getCollection } from 'astro:content'

export const getPosts = async (max?: number) => {
	return (await getCollection('blog'))
		.filter((post) => !post.data.draft)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
		.slice(0, max)
}

export const getSnippets = async () => {
	return (await getCollection('snippets'))
		.filter((snippet) => !snippet.data.draft)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
}
