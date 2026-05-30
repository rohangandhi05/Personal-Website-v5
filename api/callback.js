export default async function handler(req, res) {
	const { code } = req.query
	const clientId = process.env.OAUTH_CLIENT_ID
	const clientSecret = process.env.OAUTH_CLIENT_SECRET

	const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			code
		})
	})

	const { access_token } = await tokenRes.json()
	const provider = 'github'
	const data = JSON.stringify({ token: access_token, provider })

	res.setHeader('Content-Type', 'text/html')
	res.send(`<!doctype html>
<html>
<head><title>Authenticating...</title></head>
<body>
<script>
(function () {
  const provider = 'github'
  const data = ${data}
  function receiveMessage(e) {
    window.removeEventListener('message', receiveMessage, false)
    window.opener.postMessage(
      'authorization:' + provider + ':success:' + JSON.stringify(data),
      e.origin
    )
    window.close()
  }
  window.addEventListener('message', receiveMessage, false)
  window.opener.postMessage('authorizing:' + provider, '*')
})()
<\/script>
</body>
</html>`)
}
