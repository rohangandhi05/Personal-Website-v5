/* 3D Tic-Tac-Toe, playable in the page.
   The rules and the AI are a line-for-line JavaScript port of the Rust game (src/game.rs, src/ai.rs):
   the same 49 winning lines, the same win-then-block checks, 2,000 Monte Carlo playouts split across the
   empty cells with 70% "smart" moves, and the same position score. The board is drawn with three.js the
   way src/graphics.rs draws it in Bevy: 0.8 cubes, 2.0 apart, picked by a ray tested against empty cubes
   only, a placed cube scaling up from 0.1 while it spins twice, and a randomly tinted light each game. */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const HUMAN = 1
const AI = 2
const idx = (x, y, z) => x * 9 + y * 3 + z
const xyz = (i) => [Math.floor(i / 9), Math.floor(i / 3) % 3, i % 3]

/* ---------------- the rules (game.rs) ---------------- */

// the 49 lines, in game.rs's order: 27 along an axis, 18 face diagonals, 4 space diagonals
const LINES = []
const add = (kind, a, b, c) =>
	LINES.push({ kind, cells: [idx(...a), idx(...b), idx(...c)] })
for (let y = 0; y < 3; y++)
	for (let z = 0; z < 3; z++) add('axis', [0, y, z], [1, y, z], [2, y, z])
for (let x = 0; x < 3; x++)
	for (let z = 0; z < 3; z++) add('axis', [x, 0, z], [x, 1, z], [x, 2, z])
for (let x = 0; x < 3; x++)
	for (let y = 0; y < 3; y++) add('axis', [x, y, 0], [x, y, 1], [x, y, 2])
for (let z = 0; z < 3; z++) {
	add('face', [0, 0, z], [1, 1, z], [2, 2, z])
	add('face', [0, 2, z], [1, 1, z], [2, 0, z])
}
for (let y = 0; y < 3; y++) {
	add('face', [0, y, 0], [1, y, 1], [2, y, 2])
	add('face', [0, y, 2], [1, y, 1], [2, y, 0])
}
for (let x = 0; x < 3; x++) {
	add('face', [x, 0, 0], [x, 1, 1], [x, 2, 2])
	add('face', [x, 0, 2], [x, 1, 1], [x, 2, 0])
}
add('space', [0, 0, 0], [1, 1, 1], [2, 2, 2])
add('space', [0, 0, 2], [1, 1, 1], [2, 2, 0])
add('space', [0, 2, 0], [1, 1, 1], [2, 0, 2])
add('space', [0, 2, 2], [1, 1, 1], [2, 0, 0])

const winnerOf = (b) => {
	for (const line of LINES) {
		const [p, q, r] = line.cells
		if (b[p] && b[p] === b[q] && b[q] === b[r]) return { who: b[p], line }
	}
	return null
}
const empties = (b) => {
	const out = []
	for (let i = 0; i < 27; i++) if (!b[i]) out.push(i)
	return out
}

/* ---------------- the AI (ai.rs, MCTSAi) ---------------- */

const SIMULATIONS = 2000
const rand = (n) => Math.floor(Math.random() * n)
const isCorner = (x, y, z) => x !== 1 && y !== 1 && z !== 1
const centerCloseness = (x, y, z) =>
	1 - (Math.abs(x - 1) + Math.abs(y - 1) + Math.abs(z - 1)) / 3

// first empty cell (x, y, z order) that would complete a line for `who`
const findWinning = (b, who) => {
	for (const c of empties(b)) {
		const t = b.slice()
		t[c] = who
		if (winnerOf(t)) return c
	}
	return null
}

// a playout move: win, else block, else one of the three most central or corner cells
const chooseSmart = (b, who, moves) => {
	for (const c of moves) {
		const t = b.slice()
		t[c] = who
		if (winnerOf(t)) return c
	}
	const other = who === AI ? HUMAN : AI
	for (const c of moves) {
		const t = b.slice()
		t[c] = other
		if (winnerOf(t)) return c
	}
	const scored = moves.map((c) => {
		const [x, y, z] = xyz(c)
		return { c, s: centerCloseness(x, y, z) * 10 + (isCorner(x, y, z) ? 5 : 0) }
	})
	scored.sort((a, b) => b.s - a.s)
	return scored[rand(Math.min(3, scored.length))].c
}

// play to the end, 70% smart moves and 30% random; a full board counts as a coin flip, as in ai.rs
const simulate = (b, who) => {
	for (;;) {
		const w = winnerOf(b)
		if (w) return w.who
		const moves = empties(b)
		if (!moves.length) return Math.random() < 0.5 ? HUMAN : AI
		const c =
			Math.random() < 0.7
				? chooseSmart(b, who, moves)
				: moves[rand(moves.length)]
		b[c] = who
		who = who === AI ? HUMAN : AI
	}
}

// lines through (x, y, z) the human hasn't blocked, worth more the more AI cubes they hold
const openLines = (x, y, z, b) => {
	const lines = [
		[idx(0, y, z), idx(1, y, z), idx(2, y, z)],
		[idx(x, 0, z), idx(x, 1, z), idx(x, 2, z)],
		[idx(x, y, 0), idx(x, y, 1), idx(x, y, 2)]
	]
	if (x === y) lines.push([idx(0, 0, z), idx(1, 1, z), idx(2, 2, z)])
	if (x + y === 2) lines.push([idx(0, 2, z), idx(1, 1, z), idx(2, 0, z)])
	if (x === z) lines.push([idx(0, y, 0), idx(1, y, 1), idx(2, y, 2)])
	if (x + z === 2) lines.push([idx(0, y, 2), idx(1, y, 1), idx(2, y, 0)])
	if (y === z) lines.push([idx(x, 0, 0), idx(x, 1, 1), idx(x, 2, 2)])
	if (y + z === 2) lines.push([idx(x, 0, 2), idx(x, 1, 1), idx(x, 2, 0)])
	if (x === y && y === z) lines.push([idx(0, 0, 0), idx(1, 1, 1), idx(2, 2, 2)])
	if (x === y && y + z === 2)
		lines.push([idx(0, 0, 2), idx(1, 1, 1), idx(2, 2, 0)])
	if (x + y === 2 && y === z)
		lines.push([idx(0, 2, 0), idx(1, 1, 1), idx(2, 0, 2)])
	if (x + y === 2 && y + z === 2)
		lines.push([idx(0, 2, 2), idx(1, 1, 1), idx(2, 0, 0)])
	let count = 0
	for (const line of lines) {
		if (line.some((c) => b[c] === HUMAN)) continue
		count += 1 + line.filter((c) => b[c] === AI).length
	}
	return count
}

const positionValue = (c, b) => {
	const [x, y, z] = xyz(c)
	return (
		centerCloseness(x, y, z) * 0.1 +
		(isCorner(x, y, z) ? 0.05 : 0) +
		openLines(x, y, z, b) * 0.02
	)
}

const bestMove = (b) => {
	const free = empties(b)
	if (!free.length) return null
	let c = findWinning(b, AI)
	if (c !== null) return { move: c, why: 'win' }
	c = findWinning(b, HUMAN)
	if (c !== null) return { move: c, why: 'block' }

	const per = Math.floor(SIMULATIONS / Math.max(1, free.length))
	const rows = []
	let best = null
	let bestScore = -Infinity
	for (const cell of free) {
		let total = 0
		for (let i = 0; i < per; i++) {
			const s = b.slice()
			s[cell] = AI
			total += simulate(s, HUMAN) === AI ? 1 : -1
		}
		const avg = total / per
		const pv = positionValue(cell, b)
		rows.push({ cell, avg, pv, score: avg + pv })
		if (avg + pv > bestScore) {
			bestScore = avg + pv
			best = cell
		}
	}
	rows.sort((p, q) => q.score - p.score)
	return {
		move: best,
		why: 'search',
		per,
		playouts: per * free.length,
		top: rows.slice(0, 3)
	}
}

/* ---------------- the board (graphics.rs) ---------------- */

const root = document.querySelector('[data-game]')
const still = matchMedia('(prefers-reduced-motion: reduce)').matches
const ui = {
	status: document.querySelector('[data-status]'),
	moves: document.querySelector('[data-moves]'),
	panel: document.querySelector('[data-analysis]'),
	again: document.querySelector('[data-new]'),
	aiFirst: document.querySelector('[data-ai-first]'),
	hint: document.querySelector('[data-hint]')
}

const COLORS = {
	empty: 0x9aa3b2,
	hover: 0xd9dee7,
	human: 0x33b333,
	ai: 0xb33333,
	gold: 0xf2c94c
}
const coord = (c) => {
	const [x, y, z] = xyz(c)
	return `(${x}, ${y}, ${z})`
}

let renderer
try {
	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
} catch (e) {
	renderer = null
}

if (!renderer) {
	root.classList.add('is-nogl')
	if (ui.status)
		ui.status.textContent =
			'This browser has WebGL turned off, so the board can’t be drawn.'
} else {
	const canvas = renderer.domElement
	canvas.setAttribute(
		'aria-label',
		'The 3 by 3 by 3 board. Drag to turn it, click an empty cube to place yours.'
	)
	root.prepend(canvas)
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2))

	const scene = new THREE.Scene()
	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
	camera.position.set(6.4, 4.6, 6.4)
	const controls = new OrbitControls(camera, canvas)
	controls.enableDamping = true
	controls.enablePan = false
	controls.enableZoom = false // the page scrolls; the board only turns
	controls.rotateSpeed = 0.7
	controls.autoRotate = !still
	controls.autoRotateSpeed = 0.9

	scene.add(new THREE.AmbientLight(0xffffff, 0.9))
	const sun = new THREE.DirectionalLight(0xffffff, 2.4)
	scene.add(sun)
	const fill = new THREE.DirectionalLight(0x8fa6ff, 0.5)
	fill.position.set(-6, -3, -5)
	scene.add(fill)

	// a fresh light every game, as randomize_light_on_reset does: 6-12 away, 0.3-1.2 rad up, tinted ±0.1
	const randomLight = () => {
		const d = 6 + Math.random() * 6
		const az = Math.random() * Math.PI * 2
		const el = 0.3 + Math.random() * 0.9
		sun.position.set(
			d * Math.cos(el) * Math.cos(az),
			d * Math.sin(el) + 2 + Math.random() * 4,
			d * Math.cos(el) * Math.sin(az)
		)
		const tint = () =>
			Math.min(1, Math.max(0, 0.95 + (Math.random() * 0.2 - 0.1)))
		sun.color.setRGB(tint(), tint(), tint())
	}

	const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8)
	const edges = new THREE.EdgesGeometry(geo)
	const cubes = []
	for (let x = 0; x < 3; x++)
		for (let y = 0; y < 3; y++)
			for (let z = 0; z < 3; z++) {
				const mat = new THREE.MeshStandardMaterial({
					color: COLORS.empty,
					transparent: true,
					opacity: 0.22,
					roughness: 0.55,
					metalness: 0.05
				})
				const mesh = new THREE.Mesh(geo, mat)
				mesh.position.set((x - 1) * 2, (y - 1) * 2, (z - 1) * 2)
				const rim = new THREE.LineSegments(
					edges,
					new THREE.LineBasicMaterial({
						color: 0xc9d1dd,
						transparent: true,
						opacity: 0.32
					})
				)
				mesh.add(rim)
				mesh.userData = { cell: idx(x, y, z), rim }
				scene.add(mesh)
				cubes.push(mesh)
			}

	// the winning line: a gold rod through the three cubes
	const rod = new THREE.Mesh(
		new THREE.CylinderGeometry(0.06, 0.06, 1, 12),
		new THREE.MeshBasicMaterial({
			color: COLORS.gold,
			transparent: true,
			opacity: 0.9
		})
	)
	rod.visible = false
	scene.add(rod)

	let board = new Array(27).fill(0)
	let turn = HUMAN
	let over = false
	let hovered = null
	let hinted = null
	let win = null
	let aiTimer = null
	let moveCount = 0

	const paint = () => {
		for (const m of cubes) {
			const v = board[m.userData.cell]
			const mat = m.material
			const lit = win && win.line.cells.includes(m.userData.cell)
			if (v === HUMAN || v === AI) {
				mat.color.setHex(v === HUMAN ? COLORS.human : COLORS.ai)
				mat.opacity = win && !lit ? 0.35 : 1
				mat.emissive.setHex(
					lit ? (v === HUMAN ? 0x1c5c1c : 0x5c1c1c) : 0x000000
				)
				m.userData.rim.material.opacity = 0
			} else {
				const isHover = m === hovered || m.userData.cell === hinted
				mat.color.setHex(
					m.userData.cell === hinted
						? 0x6fa8ff
						: isHover
							? COLORS.hover
							: COLORS.empty
				)
				mat.opacity = isHover ? 0.7 : win ? 0.08 : 0.22
				mat.emissive.setHex(0x000000)
				m.userData.rim.material.opacity = win ? 0.1 : isHover ? 0.8 : 0.32
			}
		}
	}

	const setStatus = (text, tone) => {
		ui.status.textContent = text
		ui.status.dataset.tone = tone
		ui.moves.textContent = `${moveCount} of 27 cubes placed`
	}

	const showAnalysis = (who, cell, a) => {
		if (!ui.panel) return
		const head = `<p class="ai__k">Last AI move</p><p class="ai__move"><b>${coord(cell)}</b>`
		if (a.why === 'win') {
			ui.panel.innerHTML = `${head}<span>Step 1: completes a line. No playouts needed.</span></p>`
		} else if (a.why === 'block') {
			ui.panel.innerHTML = `${head}<span>Step 2: you had two in a line, so it blocked.</span></p>`
		} else {
			const max = Math.max(...a.top.map((r) => Math.abs(r.score)), 0.001)
			const rows = a.top
				.map(
					(r, i) =>
						`<li data-cell="${r.cell}"${i === 0 ? ' class="is-pick"' : ''}><span class="ai__c">${coord(r.cell)}</span>` +
						`<span class="ai__bar"><i style="--w:${Math.max(4, (Math.abs(r.score) / max) * 100)}%" class="${r.score < 0 ? 'is-neg' : ''}"></i></span>` +
						`<span class="ai__n">${r.score >= 0 ? '+' : ''}${r.score.toFixed(2)}</span></li>`
				)
				.join('')
			ui.panel.innerHTML =
				`${head}<span>Step 3: ${a.playouts.toLocaleString()} playouts, ${a.per} per empty cube. Top three:</span></p>` +
				`<ol class="ai__list">${rows}</ol><p class="ai__foot">score = playout result (−1 to +1) + position value</p>`
			ui.panel.querySelectorAll('[data-cell]').forEach((li) => {
				li.addEventListener('mouseenter', () => {
					hinted = +li.dataset.cell
					paint()
				})
				li.addEventListener('mouseleave', () => {
					hinted = null
					paint()
				})
			})
		}
	}

	const pop = (cell) => {
		const m = cubes.find((c) => c.userData.cell === cell)
		if (still) return
		m.userData.anim = performance.now()
		m.scale.setScalar(0.1)
	}

	const finish = () => {
		const w = winnerOf(board)
		if (w) {
			win = w
			over = true
			const [a, , c] = w.line.cells.map(
				(i) => cubes.find((m) => m.userData.cell === i).position
			)
			const mid = a.clone().add(c).multiplyScalar(0.5)
			const dir = c.clone().sub(a)
			rod.position.copy(mid)
			rod.scale.set(1, dir.length() + 1.2, 1)
			rod.quaternion.setFromUnitVectors(
				new THREE.Vector3(0, 1, 0),
				dir.normalize()
			)
			rod.visible = true
			const kind = {
				axis: 'a straight line',
				face: 'a face diagonal',
				space: 'a space diagonal'
			}[w.line.kind]
			setStatus(
				w.who === HUMAN
					? `You win, with ${kind}.`
					: `The AI wins, with ${kind}.`,
				w.who === HUMAN ? 'human' : 'ai'
			)
			ui.hint.hidden = true
			return true
		}
		if (!empties(board).length) {
			over = true
			setStatus('It’s a draw.', 'draw')
			return true
		}
		return false
	}

	const place = (cell, who) => {
		board[cell] = who
		moveCount++
		pop(cell)
		if (!finish()) {
			turn = who === HUMAN ? AI : HUMAN
			if (turn === AI) aiTurn()
			else setStatus('Your turn: pick an empty cube.', 'human')
		}
		paint()
	}

	// the AI waits 1.5 s before it moves, like ai_move_system's timer
	const aiTurn = () => {
		setStatus('The AI is thinking…', 'ai')
		aiTimer = setTimeout(() => {
			const a = bestMove(board)
			if (!a) return
			showAnalysis(AI, a.move, a)
			place(a.move, AI)
		}, 1500)
	}

	const reset = (aiStarts) => {
		clearTimeout(aiTimer)
		board = new Array(27).fill(0)
		over = false
		win = null
		hovered = null
		hinted = null
		moveCount = 0
		rod.visible = false
		for (const m of cubes) {
			m.scale.setScalar(1)
			m.rotation.set(0, 0, 0)
			m.userData.anim = null
		}
		randomLight()
		if (ui.panel)
			ui.panel.innerHTML =
				'<p class="ai__k">Last AI move</p><p class="ai__move"><span>The AI’s reasoning shows here after it plays.</span></p>'
		ui.hint.hidden = false
		turn = aiStarts ? AI : HUMAN
		if (aiStarts) aiTurn()
		else setStatus('Your turn: pick an empty cube.', 'human')
		paint()
	}

	// picking: a ray from the pointer, tested only against empty cubes, nearest hit wins (handle_hover)
	const ray = new THREE.Raycaster()
	const ndc = new THREE.Vector2()
	const pick = (e) => {
		const r = canvas.getBoundingClientRect()
		ndc.set(
			((e.clientX - r.left) / r.width) * 2 - 1,
			-((e.clientY - r.top) / r.height) * 2 + 1
		)
		ray.setFromCamera(ndc, camera)
		const open = cubes.filter((m) => !board[m.userData.cell])
		const hit = ray.intersectObjects(open, false)[0]
		return hit ? hit.object : null
	}
	canvas.addEventListener('pointermove', (e) => {
		if (over || turn !== HUMAN || e.pointerType !== 'mouse') return
		const m = pick(e)
		if (m !== hovered) {
			hovered = m
			canvas.style.cursor = m ? 'pointer' : 'grab'
			paint()
		}
	})
	canvas.addEventListener('pointerleave', () => {
		hovered = null
		paint()
	})
	let down = null
	canvas.addEventListener('pointerdown', (e) => {
		down = { x: e.clientX, y: e.clientY }
		controls.autoRotate = false
	})
	// a click is a press that didn't drag: dragging turns the board instead
	canvas.addEventListener('pointerup', (e) => {
		if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return
		down = null
		if (over || turn !== HUMAN) return
		const m = pick(e)
		if (!m) return
		hovered = null
		ui.hint.hidden = true
		place(m.userData.cell, HUMAN)
	})

	ui.again.addEventListener('click', () => reset(false))
	ui.aiFirst.addEventListener('click', () => reset(true))
	addEventListener('keydown', (e) => {
		if (
			(e.key === 'r' || e.key === 'R') &&
			!e.target.closest('input, textarea') &&
			root.getBoundingClientRect().bottom > 0
		)
			reset(false)
	})

	const size = () => {
		const w = root.clientWidth
		const h = root.clientHeight
		renderer.setSize(w, h, false)
		camera.aspect = w / h
		// keep the whole cube in frame on a narrow screen
		const fit = w / h < 1 ? Math.min(20, Math.max(13, 10.8 / (w / h))) : 13.8
		camera.position.setLength(fit)
		camera.updateProjectionMatrix()
	}
	new ResizeObserver(size).observe(root)
	size()

	// animate_moves: ease-out cubic from 0.1 to 1 over 0.5 s, spinning twice and ending square
	let visible = true
	new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(root)
	const loop = (now) => {
		requestAnimationFrame(loop)
		if (!visible) return
		for (const m of cubes) {
			const t0 = m.userData.anim
			if (t0 == null) continue
			const p = Math.min(1, (now - t0) / 500)
			const e = 1 - Math.pow(1 - p, 3)
			m.scale.setScalar(0.1 + 0.9 * e)
			m.rotation.y = p * 2 * Math.PI * 2 * (1 - e)
			if (p >= 1) {
				m.userData.anim = null
				m.scale.setScalar(1)
				m.rotation.y = 0
			}
		}
		if (win) rod.material.opacity = 0.65 + 0.3 * Math.sin(now / 260)
		controls.update()
		renderer.render(scene, camera)
	}
	requestAnimationFrame(loop)
	reset(false)
}

/* ---------------- the 49 lines, drawn in isometric (the #lines section) ---------------- */

const svg = document.querySelector('[data-lines]')
if (svg) {
	const NS = 'http://www.w3.org/2000/svg'
	// cabinet projection rather than isometric: isometric stacks some of the 27 points on top of each other
	const S = 88
	const pt = (c) => {
		const [x, y, z] = xyz(c)
		const X = x - 1
		const Y = y - 1
		const Z = z - 1
		return [(X + Z * 0.43) * S, (-Y - Z * 0.27) * S]
	}
	const g = document.createElementNS(NS, 'g')
	svg.append(g)
	const lineEls = LINES.map((l) => {
		const [a, , c] = l.cells.map(pt)
		const el = document.createElementNS(NS, 'line')
		el.setAttribute('x1', a[0])
		el.setAttribute('y1', a[1])
		el.setAttribute('x2', c[0])
		el.setAttribute('y2', c[1])
		el.setAttribute('class', `ln ln--${l.kind}`)
		g.append(el)
		return el
	})
	for (let i = 0; i < 27; i++) {
		const [px, py] = pt(i)
		const dot = document.createElementNS(NS, 'circle')
		dot.setAttribute('cx', px)
		dot.setAttribute('cy', py)
		dot.setAttribute('r', i === 13 ? 7 : 5)
		dot.setAttribute('class', i === 13 ? 'dot dot--c' : 'dot')
		svg.append(dot)
	}

	const btns = [...document.querySelectorAll('[data-kind]')]
	const counter = document.querySelector('[data-count]')
	let kind = 'all'
	let cycle = 0
	let timer = null
	const show = () => {
		const pool = LINES.map((l, i) => ({ l, i })).filter(
			({ l }) => kind === 'all' || l.kind === kind
		)
		lineEls.forEach((el, i) => {
			const on = kind === 'all' || LINES[i].kind === kind
			el.classList.toggle('is-in', on)
			el.classList.remove('is-now')
		})
		if (!still && pool.length)
			lineEls[pool[cycle % pool.length].i].classList.add('is-now')
		counter.textContent = pool.length
	}
	btns.forEach((b) =>
		b.addEventListener('click', () => {
			kind = b.dataset.kind
			cycle = 0
			btns.forEach((x) => x.setAttribute('aria-pressed', x === b))
			show()
		})
	)
	show()
	if (!still)
		new IntersectionObserver(([e]) => {
			clearInterval(timer)
			if (e.isIntersecting)
				timer = setInterval(() => {
					cycle++
					show()
				}, 900)
		}).observe(svg)
}
