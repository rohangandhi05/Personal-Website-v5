/* MagicMirror page.
   1. Hero: scroll progress through the tall hero drives the sticky stage's CSS variables: the mirror slides
      to the centre, zooms and turns (0-30%), its four parts pull apart along their depth (28-73%), and the
      parts list fades in (68-83%). Reduced motion leaves it assembled.
   2. Features: a module button lights that module on the mirror.
   3. Customize: region and size buttons move the cast window and rewrite the config.
   4. Seamless: the failure toggle swaps the briefing for the app's real offline values.
   5. Architecture: the provider switch rewrites the DI line and the layer names. */
;(() => {
	const clamp = (v) => Math.min(1, Math.max(0, v))
	const ease = (t) => 1 - Math.pow(1 - t, 3)
	const lerp = (a, b, t) => a + (b - a) * t

	const hero = document.querySelector('.mm-hero')
	const stage = document.querySelector('.mm-hero__sticky')
	const still = matchMedia('(prefers-reduced-motion: reduce)').matches
	if (hero && stage && !still) {
		let queued = false
		const draw = () => {
			queued = false
			const r = hero.getBoundingClientRect()
			const total = hero.offsetHeight - innerHeight
			const p = total > 0 ? clamp(-r.top / total) : 0
			const a = ease(clamp(p / 0.3))
			const b = ease(clamp((p - 0.28) / 0.45))
			const c = clamp((p - 0.68) / 0.15)
			const t = 1 - clamp((p - 0.04) / 0.18)
			const narrow = innerWidth < 1024
			const rig = stage.querySelector('.mm-rig').offsetWidth
			const s = stage.style
			// apart, the row of parts is about 2.5 rigs wide: scale down and shift left to keep it centred
			const sc = narrow
				? lerp(0.86, 0.9, a) - 0.52 * b
				: lerp(0.92, 1.08, a) - 0.58 * b
			s.setProperty('--s', sc)
			if (narrow) {
				s.setProperty('--x', `${-b * rig * 0.8 * sc}px`)
				s.setProperty(
					'--y',
					`${lerp(innerHeight * 0.2, -innerHeight * 0.02, a)}px`
				)
			} else {
				s.setProperty(
					'--x',
					`${lerp(innerWidth * 0.19, 0, a) - b * rig * 0.86 * sc}px`
				)
				s.setProperty('--y', `${-b * innerHeight * 0.06}px`)
			}
			s.setProperty('--ry', `${-28 * a}deg`)
			s.setProperty('--rx', `${8 * a}deg`)
			s.setProperty('--sep', b.toFixed(4))
			s.setProperty('--labels', c.toFixed(3))
			s.setProperty('--text', t.toFixed(3))
		}
		const queue = () => {
			if (!queued) {
				queued = true
				requestAnimationFrame(draw)
			}
		}
		addEventListener('scroll', queue, { passive: true })
		addEventListener('resize', queue)
		draw()
	}

	const featUi = document.querySelector('[data-feat-ui]')
	const feats = [...document.querySelectorAll('[data-feat]')]
	const pick = (btn) => {
		const on = btn.getAttribute('aria-pressed') !== 'true'
		feats.forEach((b) => b.setAttribute('aria-pressed', on && b === btn))
		if (on) featUi.dataset.active = btn.dataset.feat
		else delete featUi.dataset.active
	}
	feats.forEach((btn) => {
		btn.addEventListener('click', () => pick(btn))
		btn.addEventListener('mouseenter', () => {
			if (btn.getAttribute('aria-pressed') !== 'true') pick(btn)
		})
	})

	const customUi = document.querySelector('[data-custom-ui]')
	const out = (name, value) => {
		const el = document.querySelector(`[data-out="${name}"]`)
		if (el.textContent === value) return
		el.textContent = value
		el.classList.remove('is-new')
		void el.offsetWidth
		el.classList.add('is-new')
	}
	const camel = (pos) => pos.replace(/_(\w)/, (_, ch) => ch.toUpperCase())
	document.querySelectorAll('.custom__opts').forEach((group) =>
		group.addEventListener('click', (e) => {
			const btn = e.target.closest('button')
			if (!btn) return
			group
				.querySelectorAll('button')
				.forEach((b) => b.setAttribute('aria-pressed', b === btn))
			if (btn.dataset.pos) {
				customUi.dataset.pos = btn.dataset.pos
				out('region', btn.dataset.pos)
				out('window', camel(btn.dataset.pos))
			} else {
				const [w, h] = btn.dataset.size.split('x')
				customUi.dataset.size = btn.dataset.size
				out('w', w)
				out('h', h)
			}
		})
	)

	const brief = document.querySelector('.seam__brief')
	const fail = document.querySelector('.seam__toggle')
	fail.addEventListener('click', () => {
		const off = brief.dataset.offline !== 'true'
		brief.dataset.offline = off
		fail.setAttribute('aria-pressed', off)
		fail.textContent = off ? 'Restore the APIs' : 'Simulate an API failure'
		brief
			.querySelectorAll('[data-on]')
			.forEach((s) => (s.textContent = off ? s.dataset.off : s.dataset.on))
	})

	const names = {
		mq: [
			'MapQuestTrafficService',
			'MapQuestTrafficRepo',
			'miles × 1.60934 → km'
		],
		gm: [
			'GoogleMapsTrafficService',
			'GoogleMapsTrafficRepo',
			'metres ÷ 1000 → km'
		]
	}
	const stack = document.querySelector('.arch__stack')
	const provs = [...document.querySelectorAll('.arch__switch button')]
	provs.forEach((btn) =>
		btn.addEventListener('click', () => {
			const [svc, repo, unit] = names[btn.dataset.provider]
			stack.dataset.provider = btn.dataset.provider
			provs.forEach((b) => b.setAttribute('aria-pressed', b === btn))
			document.querySelector('[data-prov-svc]').textContent = svc
			document.querySelector('[data-prov-name]').textContent = svc
			document.querySelector('[data-prov-repo]').textContent = repo
			document.querySelector('[data-prov-unit]').textContent = unit
		})
	)
})()
