// Delayed quotes for the ticker on /snippets, from Yahoo's public chart endpoint
const SYMBOLS = [
	['^IXIC', 'NASDAQ'],
	['^GSPC', 'S&P 500'],
	['NVDA', 'NVIDIA'],
	['AAPL', 'Apple'],
	['MSFT', 'Microsoft'],
	['GOOGL', 'Google'],
	['AMZN', 'Amazon'],
	['META', 'Meta'],
	['TSLA', 'Tesla'],
	['AVGO', 'Broadcom'],
	['TSM', 'TSMC'],
	['AMD', 'AMD'],
	['ASML', 'ASML'],
	['PLTR', 'Palantir'],
	['NFLX', 'Netflix'],
	['ORCL', 'Oracle'],
	['BTC-USD', 'Bitcoin'],
	['ETH-USD', 'Ethereum']
]

async function fetchQuote([symbol, label = symbol]) {
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
	const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
	if (!res.ok) throw new Error(`${symbol}: ${res.status}`)

	const result = (await res.json()).chart.result[0]
	const closes = result.indicators.quote[0].close.filter((c) => c != null)
	const price = result.meta.regularMarketPrice
	// The last daily close is the latest session's, so compare with the one before
	const prev = closes.at(-2)
	return { label, price, change: prev ? ((price - prev) / prev) * 100 : 0 }
}

export default async function handler(req, res) {
	const settled = await Promise.allSettled(SYMBOLS.map(fetchQuote))
	const quotes = settled
		.filter((r) => r.status === 'fulfilled')
		.map((r) => r.value)

	res.setHeader('Content-Type', 'application/json')
	if (quotes.length === 0) {
		res.statusCode = 502
		res.end(JSON.stringify({ quotes: [] }))
		return
	}
	// Cache at Vercel's edge so visitors don't each hit Yahoo
	res.setHeader(
		'Cache-Control',
		'public, s-maxage=300, stale-while-revalidate=600'
	)
	res.end(JSON.stringify({ quotes }))
}
