/* Vedic Hindi School page: lights the step of the school week being read, and switches the
   highlighted role in the permissions table. */
;(() => {
	const links = [...document.querySelectorAll('[data-week-link]')]
	const steps = [...document.querySelectorAll('[data-week]')]
	const light = (n) =>
		links.forEach((a) =>
			a.classList.toggle('is-active', a.dataset.weekLink === n)
		)
	if ('IntersectionObserver' in window && steps.length) {
		light('1')
		const io = new IntersectionObserver(
			(entries) =>
				entries.forEach(
					(e) => e.isIntersecting && light(e.target.dataset.week)
				),
			{ rootMargin: '-45% 0px -45% 0px' }
		)
		steps.forEach((s) => io.observe(s))
	}

	const table = document.querySelector('.access')
	const roles = [...document.querySelectorAll('.access__roles button')]
	roles.forEach((btn) =>
		btn.addEventListener('click', () => {
			table.dataset.role = btn.dataset.role
			roles.forEach((b) => b.setAttribute('aria-pressed', b === btn))
		})
	)
})()
