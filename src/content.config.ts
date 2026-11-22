import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const blog = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
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

const snippets = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/snippets' }),
	schema: z.object({
		title: z.string().max(120).optional(),
		// Shown as a small label above the title, e.g. on company overviews
		company: z.string().max(60).optional(),
		pubDate: z
			.string()
			.or(z.date())
			.transform((val) => new Date(val)),
		draft: z.boolean().default(false)
	})
})

export const collections = { blog, snippets }
