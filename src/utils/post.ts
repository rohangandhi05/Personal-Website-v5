import { getCollection } from 'astro:content'

export const getPosts = async (max?: number) => {
	return (await getCollection('blog'))
		.filter((post) => !post.data.draft)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
		.slice(0, max)
}

export const getPostByYear = async (year: number) => {
	const posts = await getPosts()
	return posts.filter((post) => post.data.pubDate.getFullYear() === year)
}
