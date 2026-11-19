import { randomBytes } from 'node:crypto'

export default function handler(req, res) {
	const clientId = process.env.OAUTH_CLIENT_ID
	const proto = req.headers['x-forwarded-proto'] || 'https'
	const host = req.headers['host']
	const redirectUri = `${proto}://${host}/api/callback`

	// Random state ties the GitHub redirect back to this browser (CSRF protection)
	const state = randomBytes(16).toString('hex')
	res.setHeader(
		'Set-Cookie',
		`oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
	)

	const params = new URLSearchParams({
		client_id: clientId,
		scope: 'public_repo',
		redirect_uri: redirectUri,
		state
	})
	res.redirect(`https://github.com/login/oauth/authorize?${params}`)
}
