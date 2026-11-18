/* Opens each problem card's deep dive: on hover where there is a mouse, on click or tap
   everywhere (a click pins it open), Escape closes. One card open at a time. */
;(() => {
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
		const btn = card.querySelector('.det__toggle')
		btn.addEventListener('click', () => {
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
