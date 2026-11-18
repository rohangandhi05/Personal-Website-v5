/* Lights each step of a [data-flow] box in the order a move travels (the hero panel, the architecture
   panel), rests on the whole path, then repeats: 700 ms a step, paused off screen, restarted on
   hover. Reduced motion (or no IntersectionObserver) keeps every step lit. */
;(() => {
	if (
		matchMedia('(prefers-reduced-motion: reduce)').matches ||
		!('IntersectionObserver' in window)
	)
		return

	const run = (el) => {
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

	document.querySelectorAll('[data-flow]').forEach(run)
})()
