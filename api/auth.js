export default function handler(req, res) {
	const clientId = process.env.OAUTH_CLIENT_ID
	const proto = req.headers['x-forwarded-proto'] || 'https'
	const host = req.headers['host']
	const redirectUri = `${proto}://${host}/api/callback`
	const params = new URLSearchParams({
		client_id: clientId,
		scope: 'repo',
		redirect_uri: redirectUri
	})
	res.redirect(`https://github.com/login/oauth/authorize?${params}`)
}
