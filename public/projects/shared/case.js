/* Shared behaviour for the project pages.
   1. [data-flow]: lights each [data-flow-step] in order (700 ms a step), rests on the whole path, repeats;
      paused off screen, restarted on hover. Reduced motion (or no IntersectionObserver) keeps every step lit.
   2. #details cards: the deep dive opens on hover where there is a mouse, on click or tap everywhere
      (a click pins it open), Escape closes. One card open at a time. */
;(() => {
	const still =
		matchMedia('(prefers-reduced-motion: reduce)').matches ||
		!('IntersectionObserver' in window)

	const flow = (el) => {
		const items = [...el.querySelectorAll('[data-flow-step]')]
		const REST = Math.max(...items.map((x) => +x.dataset.flowStep)) + 1
		let step = -1,
			timer = null

		const show = (n) =>
			items.forEach((x) => {
				const s = +x.dataset.flowStep
				x.classList.toggle('is-on', s <= n)
				x.classList.toggle('is-now', s === n)
			})
		const tick = () => {
			step = step >= REST ? 0 : step + 1
			show(step)
		}
		const start = () => {
			if (!timer) {
				tick()
				timer = setInterval(tick, 700)
			}
		}
		const stop = () => {
			clearInterval(timer)
			timer = null
		}

		el.classList.add('is-live')
		show(-1)
		new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), {
			threshold: 0.35
		}).observe(el)
		el.addEventListener('mouseenter', () => {
			step = -1
		})
	}
	if (!still) document.querySelectorAll('[data-flow]').forEach(flow)

	const cards = [
		...document.querySelectorAll('#details article:has(.det__toggle)')
	]
	const canHover = matchMedia('(hover: hover) and (pointer: fine)')

	const set = (card, open) => {
		card.classList.toggle('is-open', open)
		card.querySelector('.det__toggle').setAttribute('aria-expanded', open)
		if (!open) card.classList.remove('is-pinned')
	}
	const only = (card) => cards.forEach((c) => c !== card && set(c, false))

	cards.forEach((card) => {
		card.querySelector('.det__toggle').addEventListener('click', () => {
			const pin = !card.classList.contains('is-pinned')
			only(card)
			set(card, pin)
			card.classList.toggle('is-pinned', pin)
		})
		card.addEventListener('mouseenter', () => {
			if (!canHover.matches) return
			only(card)
			set(card, true)
		})
		card.addEventListener('mouseleave', () => {
			if (canHover.matches && !card.classList.contains('is-pinned'))
				set(card, false)
		})
	})

	document.addEventListener('keydown', (e) => {
		if (e.key !== 'Escape') return
		const open = cards.find((c) => c.classList.contains('is-open'))
		if (!open) return
		set(open, false)
		open.querySelector('.det__toggle').focus()
	})
	document.addEventListener('click', (e) => {
		if (!e.target.closest('#details article'))
			cards.forEach((c) => set(c, false))
	})
})()
