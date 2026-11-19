const provider = 'github'

// Hands the result to the Decap CMS window that opened this popup, but only if
// that window is on this site's own origin; any other opener gets nothing.
function renderResult(res, status, content) {
	// Escape '<' so the JSON can't close the <script> tag
	const message = JSON.stringify(
		`authorization:${provider}:${status}:${JSON.stringify(content)}`
	).replace(/</g, '\\u003c')

	res.setHeader('Content-Type', 'text/html')
	res.setHeader('Cache-Control', 'no-store')
	res.send(`<!doctype html>
<html>
<head><title>Authenticating...</title></head>
<body>
<script>
(function () {
  const origin = window.location.origin
  function receiveMessage(e) {
    if (e.origin !== origin) return
    window.removeEventListener('message', receiveMessage, false)
    window.opener.postMessage(${message}, origin)
    window.close()
  }
  if (!window.opener) return
  window.addEventListener('message', receiveMessage, false)
  window.opener.postMessage('authorizing:${provider}', origin)
})()
<\/script>
</body>
</html>`)
}

function readCookie(req, name) {
	const match = (req.headers.cookie || '')
		.split(';')
		.map((c) => c.trim())
		.find((c) => c.startsWith(`${name}=`))
	return match ? match.slice(name.length + 1) : null
}

export default async function handler(req, res) {
	const { code, state, error } = req.query
	const expectedState = readCookie(req, 'oauth_state')

	// The state cookie is single-use
	res.setHeader(
		'Set-Cookie',
		'oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
	)

	if (error) {
		return renderResult(res, 'error', { message: String(error) })
	}
	if (!code || !state || !expectedState || state !== expectedState) {
		return renderResult(res, 'error', { message: 'Invalid OAuth state' })
	}

	try {
		const tokenRes = await fetch(
			'https://github.com/login/oauth/access_token',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify({
					client_id: process.env.OAUTH_CLIENT_ID,
					client_secret: process.env.OAUTH_CLIENT_SECRET,
					code
				})
			}
		)
		const body = await tokenRes.json()
		if (!tokenRes.ok || !body.access_token) {
			return renderResult(res, 'error', {
				message: body.error_description || 'Token exchange failed'
			})
		}
		return renderResult(res, 'success', { token: body.access_token, provider })
	} catch {
		return renderResult(res, 'error', { message: 'Token exchange failed' })
	}
}
