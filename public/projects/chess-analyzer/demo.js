// Chess Real-Time Analyzer: the page's boards and the playable demo.
// The demo runs the extension's own Stockfish build (engine/stockfish.js) in a Web Worker and asks it
// what the extension asks: three lines (MultiPV 3), depth 12, answered early once all three reach depth 8.
;(function () {
	'use strict'

	var FILES = 'abcdefgh'
	var NAMES = {
		p: 'Pawn',
		n: 'Knight',
		b: 'Bishop',
		r: 'Rook',
		q: 'Queen',
		k: 'King'
	}
	var COLOUR = { w: 'white', b: 'black' }

	// ---------- drawing a board ----------
	function squares(flip) {
		var out = []
		for (var r = 0; r < 8; r++)
			for (var f = 0; f < 8; f++) {
				var file = flip ? 7 - f : f,
					rank = flip ? r + 1 : 8 - r
				out.push(FILES[file] + rank)
			}
		return out
	}

	function pieceAt(placement) {
		var map = {},
			rows = placement.split(' ')[0].split('/')
		rows.forEach(function (row, i) {
			var f = 0
			for (var c of row) {
				if (/\d/.test(c)) {
					f += +c
					continue
				}
				map[FILES[f] + (8 - i)] =
					(c === c.toUpperCase() ? 'w' : 'b') + c.toUpperCase()
				f++
			}
		})
		return map
	}

	function draw(el, fen, opts) {
		opts = opts || {}
		var map = pieceAt(fen),
			flip = !!opts.flip,
			sqs = squares(flip),
			html = ''
		var last = opts.last || [],
			hot = opts.hot || [],
			sel = opts.sel,
			targets = opts.targets || []
		sqs.forEach(function (sq, i) {
			var file = FILES.indexOf(sq[0]),
				rank = +sq[1],
				dark = (file + rank) % 2 === 0
			var p = map[sq],
				cls = 'cw__sq' + (dark ? ' is-dark' : '')
			if (last.indexOf(sq) > -1) cls += ' is-last'
			if (hot.indexOf(sq) > -1) cls += ' is-hot'
			if (sel === sq) cls += ' is-sel'
			if (targets.indexOf(sq) > -1)
				cls += ' is-target' + (p ? ' has-piece' : '')
			var label =
				sq +
				(p
					? ', ' + COLOUR[p[0]] + ' ' + NAMES[p[1].toLowerCase()].toLowerCase()
					: '')
			var attrs = opts.live
				? ' role="gridcell" tabindex="' +
					(i === 0 ? '0' : '-1') +
					'" data-sq="' +
					sq +
					'" aria-label="' +
					label +
					'"'
				: ''
			html += '<div class="' + cls + '"' + attrs + '>'
			if (p) html += '<img src="pieces/' + p + '.svg" alt="">'
			html += '</div>'
		})
		el.innerHTML = html
		var rb = el.closest('.rb')
		if (rb) {
			var size = el.getBoundingClientRect().height / 8
			if (size) rb.style.setProperty('--rb-sq', size + 'px')
		}
	}

	document.querySelectorAll('[data-board]').forEach(function (el) {
		draw(el, el.dataset.board, {
			last: (el.dataset.last || '').split(',').filter(Boolean),
			hot: (el.dataset.hot || '').split(',').filter(Boolean)
		})
	})
	window.addEventListener('resize', function () {
		document.querySelectorAll('.rb__board').forEach(function (el) {
			el.closest('.rb').style.setProperty(
				'--rb-sq',
				el.getBoundingClientRect().height / 8 + 'px'
			)
		})
	})

	// ---------- move names, as the extension writes them ----------
	function readable(m) {
		if (!m) return '--'
		if (m.flags.indexOf('k') > -1) return 'Castle Kingside'
		if (m.flags.indexOf('q') > -1) return 'Castle Queenside'
		return NAMES[m.piece] + (m.captured ? ' takes ' : ' to ') + m.to
	}
	function uciMove(chess, uci) {
		var probe = new Chess(chess.fen())
		return probe.move({
			from: uci.slice(0, 2),
			to: uci.slice(2, 4),
			promotion: uci[4] || 'q'
		})
	}
	function score(type, value) {
		if (type === 'mate')
			return {
				text: (value > 0 ? 'M' : '-M') + Math.abs(value),
				cls: value > 0 ? 'is-good' : 'is-bad'
			}
		var cp = value / 100,
			text = (cp >= 0 ? '+' : '') + cp.toFixed(1)
		return { text: text, cls: cp > 0.5 ? 'is-good' : cp < -0.5 ? 'is-bad' : '' }
	}

	// ---------- the demo ----------
	var root = document.querySelector('[data-demo]')
	if (!root || typeof Chess === 'undefined') return

	var boardEl = root.querySelector('[data-demo-board]')
	var movesEl = root.querySelector('[data-demo-moves]')
	var statusEl = root.querySelector('[data-demo-status]')
	var ov = root.querySelector('.ov--live')
	var dot = ov.querySelector('[data-ov-dot]')
	var bestEl = ov.querySelector('[data-ov-best]')
	var evalEl = ov.querySelector('[data-ov-eval]')
	var topEl = ov.querySelector('[data-ov-top]')
	var recentEl = ov.querySelector('[data-ov-recent]')
	var openingEl = root.querySelector('[data-demo-opening]')
	var hintEl = root.querySelector('[data-demo-hint]')
	if (matchMedia('(pointer: coarse)').matches)
		hintEl.lastElementChild.lastChild.textContent =
			'Tap a piece, then the square to move it to'

	var game = new Chess(),
		me = 'w',
		flipped = false,
		sel = null,
		last = [],
		recent = [],
		token = 0,
		busy = false

	// the engine: one worker, one search at a time; a search started over another stops it
	var engine = null,
		current = null,
		queued = null
	function startEngine() {
		if (engine) return
		engine = new Worker('engine/stockfish.js')
		engine.onmessage = function (e) {
			onLine(String(e.data))
		}
		// this build is single-threaded: a Threads option stalls it before readyok
		;['uci', 'isready'].forEach(function (c) {
			engine.postMessage(c)
		})
	}
	function onLine(line) {
		if (!current) return
		if (line.indexOf('info depth') === 0 && line.indexOf(' pv ') > -1) {
			var d = +(/depth (\d+)/.exec(line) || [])[1],
				k = +(/multipv (\d+)/.exec(line) || [, 1])[1]
			var s = /score (cp|mate) (-?\d+)/.exec(line),
				pv = / pv (.+)/.exec(line)
			if (!s || !pv) return
			current.lines[k - 1] = {
				depth: d,
				type: s[1],
				value: +s[2],
				move: pv[1].split(' ')[0]
			}
			current.depth = d
			var full =
				current.lines.filter(function (l) {
					return l && l.depth >= 8
				}).length >= current.multipv
			if (current.early && !current.done && d >= 8 && full) {
				finish(current.lines.filter(Boolean))
				engine.postMessage('stop')
			}
		} else if (line.indexOf('bestmove') === 0) {
			if (!current.done)
				finish(
					current.lines.filter(Boolean).length
						? current.lines.filter(Boolean)
						: [{ move: line.split(' ')[1] }]
				)
			current = null
			if (queued) {
				var q = queued
				queued = null
				run(q)
			}
		}
	}
	function finish(lines) {
		current.done = true
		current.resolve(lines)
	}
	function run(job) {
		current = job
		job.lines = []
		job.depth = 0
		engine.postMessage('setoption name Skill Level value ' + job.skill)
		engine.postMessage('setoption name MultiPV value ' + job.multipv)
		engine.postMessage('position fen ' + job.fen)
		engine.postMessage(job.go)
	}
	function search(job) {
		startEngine()
		return new Promise(function (resolve) {
			job.resolve = resolve
			if (current) {
				if (queued) queued.resolve(null)
				queued = job
				if (!current.done) {
					current.done = true
					current.resolve(null)
					engine.postMessage('stop')
				}
			} else run(job)
		})
	}

	function render() {
		var targets = sel
			? game.moves({ square: sel, verbose: true }).map(function (m) {
					return m.to
				})
			: []
		draw(boardEl, game.fen(), {
			flip: (me === 'b') !== flipped,
			last: last,
			sel: sel,
			targets: targets,
			live: true
		})
		var hist = game.history(),
			rows = ''
		for (var i = 0; i < hist.length; i += 2)
			rows +=
				'<li><span>' +
				(1 + i / 2) +
				'.</span><b>' +
				hist[i] +
				'</b><b>' +
				(hist[i + 1] || '') +
				'</b></li>'
		movesEl.innerHTML = rows
		movesEl.scrollTop = movesEl.scrollHeight
		recentEl.textContent = recent.length
			? recent.slice(-2).join('  ·  ')
			: 'Waiting for moves'
		var n = Math.floor(hist.length / 2) + 1
		openingEl.textContent = hist.length
			? 'Move ' +
				n +
				', ' +
				(game.turn() === 'w' ? 'White' : 'Black') +
				' to move'
			: 'Starting position'
		// the hint waits on the board until the visitor's first move of each game, and steps
		// aside while a piece is picked up
		var myMoves =
			me === 'w' ? Math.ceil(hist.length / 2) : Math.floor(hist.length / 2)
		hintEl.hidden = !(myMoves === 0 && game.turn() === me && !sel && !busy)
	}

	function setPanel(best, ev, cls, lines) {
		bestEl.textContent = best
		evalEl.textContent = ev
		evalEl.className = 'ov__eval' + (cls ? ' ' + cls : '')
		topEl.innerHTML = (lines || [])
			.map(function (l, i) {
				return (
					'<li><span>' +
					(i + 1) +
					'</span><span>' +
					l.name +
					'</span><span>' +
					l.score +
					'</span></li>'
				)
			})
			.join('')
	}

	function over() {
		if (!game.game_over()) return false
		var text = game.in_checkmate()
			? game.turn() === me
				? 'Checkmate. The computer wins.'
				: 'Checkmate. You win.'
			: 'Draw.'
		statusEl.textContent = text
		setPanel('--', 'Game over', '', [])
		dot.className = 'ov__dot is-wait'
		return true
	}

	function analyse() {
		if (over()) return
		var t = ++token,
			fen = game.fen()
		dot.className = 'ov__dot is-run'
		statusEl.textContent = 'Your move'
		setPanel('--', 'Analyzing…', '', [])
		search({
			fen: fen,
			multipv: 3,
			skill: 20,
			early: true,
			go: 'go depth 12'
		}).then(function (lines) {
			if (!lines || t !== token) return // a newer position was asked for: drop this answer
			var named = lines.slice(0, 3).map(function (l) {
				var s = score(l.type, l.value)
				return {
					name: readable(uciMove(game, l.move)),
					score: s.text,
					cls: s.cls
				}
			})
			setPanel(named[0].name, named[0].score, named[0].cls, named)
			dot.className = 'ov__dot'
		})
	}

	function reply() {
		if (over()) return
		var t = ++token
		busy = true
		dot.className = 'ov__dot is-wait'
		statusEl.textContent = 'Computer is thinking'
		setPanel('--', "Opponent's turn", '', [])
		search({
			fen: game.fen(),
			multipv: 1,
			skill: 4,
			early: false,
			go: 'go movetime 500'
		}).then(function (lines) {
			if (!lines || t !== token) {
				busy = false
				return
			}
			var m = game.move({
				from: lines[0].move.slice(0, 2),
				to: lines[0].move.slice(2, 4),
				promotion: lines[0].move[4] || 'q'
			})
			busy = false
			if (!m) return
			last = [m.from, m.to]
			recent.push((m.color === 'w' ? 'White: ' : 'Black: ') + m.san)
			render()
			analyse()
		})
	}

	function play(from, to) {
		var m = game.move({ from: from, to: to, promotion: 'q' })
		sel = null
		if (!m) {
			render()
			return
		}
		last = [m.from, m.to]
		recent.push((m.color === 'w' ? 'White: ' : 'Black: ') + m.san)
		render()
		reply()
	}

	function newGame(colour) {
		token++
		game = new Chess()
		me = colour
		flipped = false
		sel = null
		last = []
		recent = []
		ov.querySelectorAll('[data-ov-color]').forEach(function (b) {
			b.classList.toggle('is-on', b.dataset.ovColor === colour)
		})
		render()
		if (colour === 'b') reply()
		else analyse()
	}

	boardEl.addEventListener('click', function (e) {
		var cell = e.target.closest('[data-sq]')
		if (!cell || busy || game.turn() !== me || game.game_over()) return
		var sq = cell.dataset.sq,
			p = game.get(sq)
		if (sel && sel !== sq) {
			var legal = game.moves({ square: sel, verbose: true }).some(function (m) {
				return m.to === sq
			})
			if (legal) {
				play(sel, sq)
				return
			}
		}
		sel = p && p.color === me && sel !== sq ? sq : null
		render()
		var again = boardEl.querySelector('[data-sq="' + sq + '"]')
		if (again) again.focus({ preventScroll: true })
	})
	boardEl.addEventListener('keydown', function (e) {
		var cell = e.target.closest('[data-sq]')
		if (!cell) return
		var cells = Array.prototype.slice.call(
				boardEl.querySelectorAll('[data-sq]')
			),
			i = cells.indexOf(cell),
			n = i
		if (e.key === 'ArrowRight') n = i + 1
		else if (e.key === 'ArrowLeft') n = i - 1
		else if (e.key === 'ArrowDown') n = i + 8
		else if (e.key === 'ArrowUp') n = i - 8
		else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			cell.click()
			return
		} else return
		e.preventDefault()
		if (cells[n]) {
			cell.tabIndex = -1
			cells[n].tabIndex = 0
			cells[n].focus()
		}
	})

	ov.querySelectorAll('[data-ov-color]').forEach(function (b) {
		b.addEventListener('click', function () {
			newGame(b.dataset.ovColor)
		})
	})
	ov.querySelector('[data-ov-hide]').addEventListener('click', function (e) {
		var hidden = ov.classList.toggle('is-hidden')
		e.currentTarget.textContent = hidden ? 'Show' : 'Hide'
	})
	root.querySelector('[data-demo-new]').addEventListener('click', function () {
		newGame(me)
	})
	root.querySelector('[data-demo-flip]').addEventListener('click', function () {
		flipped = !flipped
		render()
	})

	render()
	// the engine (1.5 MB) loads once the demo comes near the screen
	var io = new IntersectionObserver(
		function (entries) {
			if (
				entries.some(function (en) {
					return en.isIntersecting
				})
			) {
				io.disconnect()
				startEngine()
				analyse()
			}
		},
		{ rootMargin: '400px' }
	)
	io.observe(root)
})()
