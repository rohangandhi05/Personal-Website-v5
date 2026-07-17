import { defineCollection, z } from 'astro:content'

const blog = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string().max(120),
		description: z.string(),
		// Transform string to Date object
		pubDate: z
			.string()
			.or(z.date())
			.transform((val) => new Date(val)),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false)
	})
})

export const collections = { blog }
