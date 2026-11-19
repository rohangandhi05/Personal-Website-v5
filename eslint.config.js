import eslintPluginAstro from 'eslint-plugin-astro'
import tsParser from '@typescript-eslint/parser'

export default [
	{
		ignores: ['dist/', '.astro/', 'node_modules/', 'public/', '.taste-skill/']
	},
	...eslintPluginAstro.configs.recommended,
	{
		files: ['**/*.ts'],
		languageOptions: { parser: tsParser }
	},
	{
		files: ['**/*.astro'],
		rules: {
			'astro/no-set-html-directive': 'error'
		}
	}
]
