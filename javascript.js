(function () {
  'use strict';

  /* Fallback if the script's own URL can't be read (used to locate style.css) */
  const CSS_FALLBACK = 'https://cdn.jsdelivr.net/gh/tazheath/jmk-inventory-widget@main/style.css';

  /* Markup injected into every .car-dir-widget container */
  const SCAFFOLD = `
  <div class="car-dir">
    <div class="car-dir__filters">
      <button class="filter-tab active" data-filter="all">All Vehicles</button>
      <button class="filter-tab" data-filter="car">Car</button>
      <button class="filter-tab" data-filter="suv">SUV</button>
      <button class="filter-tab" data-filter="minivan">Minivan</button>
      <button class="filter-tab" data-filter="truck">Truck</button>
    </div>
    <div class="car-dir__grid"></div>
  </div>

  <div class="car-modal" id="carModal" role="dialog" aria-modal="true" aria-labelledby="modalCarName">
    <div class="car-modal__backdrop"></div>
    <button class="car-modal__nav car-modal__nav--prev" id="modalPrev" aria-label="Previous vehicle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
    <button class="car-modal__nav car-modal__nav--next" id="modalNext" aria-label="Next vehicle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
    <div class="car-modal__dialog">
      <button class="car-modal__close" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <div class="car-modal__img-wrap"><img class="car-modal__img" id="modalImg" src="" alt="" /></div>
      <div class="car-modal__body">
        <div class="car-modal__header">
          <h3 class="car-modal__name" id="modalCarName"></h3>
          <span class="car-modal__price" id="modalPrice"></span>
        </div>
        <p class="car-modal__description" id="modalDescription"></p>
        <div class="car-modal__pills" id="modalPills"></div>
        <div class="car-modal__specs">
          <div class="car-modal__spec" id="modalSpecMileage"><div><span class="car-modal__spec-label">Mileage</span><span class="car-modal__spec-value" id="modalMileage"></span></div></div>
          <div class="car-modal__spec car-modal__spec--vin" id="modalSpecVin"><div><span class="car-modal__spec-label">VIN</span><span class="car-modal__spec-value" id="modalVin"></span></div></div>
          <div class="car-modal__spec" id="modalSpecTitle"><div><span class="car-modal__spec-label">Title</span><span class="car-modal__spec-value" id="modalTitle"></span></div></div>
          <div class="car-modal__spec" id="modalSpecLocation"><div><span class="car-modal__spec-label">Location</span><a class="car-modal__spec-value car-modal__loc-link" id="modalLocation" href="#" target="_blank" rel="noopener noreferrer"></a></div></div>
        </div>
        <div class="car-modal__actions" id="modalActions">
          <a class="car-modal__cta-btn" id="modalCtaBtn" href="#" target="_blank" rel="noopener noreferrer"></a>
          <a class="car-modal__carfax" id="modalCarfax" href="#" target="_blank" rel="noopener noreferrer" aria-label="View Carfax report"><img src="https://www.carfaxonline.com/assets/subscriber/cfxlogo.jpg" width="135" height="auto" aria-label="CarFax logo - click to view carfax"></a>
          <div class="car-modal__phones" id="modalPhones"></div>
        </div>
        <div class="car-modal__gallery" id="modalGallery"><div class="car-modal__gallery-grid" id="modalGalleryGrid"></div></div>
      </div>
    </div>
  </div>
`;

  /* Load style.css once, from the same repo/branch the script is served from */
  function injectCssOnce() {
    if (document.querySelector('link[data-jmk-inv]')) return;
    let href = CSS_FALLBACK;
    const s = document.querySelector('script[src*="cdn.jsdelivr.net"][src*="javascript.js"]')
           || document.querySelector('script[src*="javascript.js"]');
    if (s && s.src) href = s.src.replace(/javascript\.js(\?.*)?$/, 'style.css');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-jmk-inv', '');
    document.head.appendChild(link);
  }

  function initWidget(element) {

    /* Inject the widget markup into this container */
    element.innerHTML = SCAFFOLD;

    /* ═══ 1. CONFIG (from data-attributes on .car-dir-widget) ═══ */
    const AIRTABLE_TOKEN  = (element.dataset.token   || '').trim();
    const BASE_ID         = (element.dataset.baseId  || '').trim();
    const TABLE_NAME      = 'Vehicles';

    const LOCATION_FILTER = (element.dataset.location || '').trim();
    const VEHICLE_FILTER  = (element.dataset.vehicle  || '').trim();
    const BUTTON_TEXT     = 'Explore Vehicle';

    const grid = element.querySelector('.car-dir__grid');
    if (!grid) return;

    if (!AIRTABLE_TOKEN || !BASE_ID) {
      grid.innerHTML = '<p class="car-dir__empty">Widget not configured: set data-base-id and data-token on the .car-dir-widget div.</p>';
      return;
    }

  const ICON_MILEAGE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>';
  const ICON_TRANS   = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18"/><path d="M3 15h18"/><path d="M8 3v18"/><path d="M16 3v18"/></svg>';
  const PHONE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  const esc = v => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const slug = v => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pill = v => v ? `<span class="car-pill car-pill--${slug(v)}">${esc(v)}</span>` : '';

  const emptyMsg = () => '<p class="car-dir__empty">There are currently no vehicles in our inventory matching this criteria.</p>';

  const LOCATIONS = {
    fairview: {
      maps: 'https://www.google.com/maps/place/JMK+AUTO/data=!4m2!3m1!1s0x0:0xbcc20ae8d436c358?sa=X&ved=1t:2428&ictx=111',
      phone: ['801-755-0700', '801-696-7571']
    },
    ogden: {
      maps: 'https://www.google.com/maps/place/JMK+AUTO/data=!4m2!3m1!1s0x0:0x1b167dfebb4b0f3?sa=X&ved=1t:2428&hl=en&ictx=111',
      phone: '385-244-0424'
    }
  };
  const locInfo = loc => LOCATIONS[String(loc).toLowerCase().trim()] || {};

  /* ═══ Full-screen lightbox (built once, reused) ═══ */
  let lightbox = null, lightboxImg = null, lightboxPhotos = [], lightboxIndex = 0;

  function buildLightbox() {
    if (lightbox) return;
    lightbox = document.createElement('div');
    lightbox.className = 'car-lightbox';
    lightbox.innerHTML =
      '<button class="car-lightbox__close" aria-label="Close">&times;</button>' +
      '<button class="car-lightbox__nav car-lightbox__nav--prev" aria-label="Previous">&#8249;</button>' +
      '<img class="car-lightbox__img" alt="" />' +
      '<button class="car-lightbox__nav car-lightbox__nav--next" aria-label="Next">&#8250;</button>';
    element.appendChild(lightbox);
    lightboxImg = lightbox.querySelector('.car-lightbox__img');
    lightbox.querySelector('.car-lightbox__close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.car-lightbox__nav--prev').addEventListener('click', (e) => { e.stopPropagation(); showLightbox(lightboxIndex - 1); });
    lightbox.querySelector('.car-lightbox__nav--next').addEventListener('click', (e) => { e.stopPropagation(); showLightbox(lightboxIndex + 1); });
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  }

  function openLightbox(photos, index) {
    buildLightbox();
    lightboxPhotos = photos || [];
    if (!lightboxPhotos.length) return;
    showLightbox(index || 0);
    lightbox.classList.add('is-open');
  }

  function showLightbox(i) {
    if (!lightboxPhotos.length) return;
    if (i < 0) i = lightboxPhotos.length - 1;
    if (i >= lightboxPhotos.length) i = 0;
    lightboxIndex = i;
    lightboxImg.src = lightboxPhotos[i];
    const multi = lightboxPhotos.length > 1;
    lightbox.querySelector('.car-lightbox__nav--prev').style.display = multi ? '' : 'none';
    lightbox.querySelector('.car-lightbox__nav--next').style.display = multi ? '' : 'none';
  }

  function closeLightbox() { if (lightbox) lightbox.classList.remove('is-open'); }

  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeLightbox(); }
    else if (e.key === 'ArrowLeft')  { e.stopPropagation(); showLightbox(lightboxIndex - 1); }
    else if (e.key === 'ArrowRight') { e.stopPropagation(); showLightbox(lightboxIndex + 1); }
  });

  /* ═══ 2. FETCH + RENDER ═══ */
  async function loadInventory() {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;padding:40px;">Loading inventory…</p>';

    const clauses = [`{Status}!='Sold'`];
    if (LOCATION_FILTER) clauses.push(`LOWER({Location})='${LOCATION_FILTER.toLowerCase()}'`);
    if (VEHICLE_FILTER)  clauses.push(`LOWER({Vehicle Type})='${VEHICLE_FILTER.toLowerCase()}'`);
    const formula = clauses.length > 1 ? `AND(${clauses.join(',')})` : clauses[0];

    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`
              + `?filterByFormula=${encodeURIComponent(formula)}`
              + `&sort%5B0%5D%5Bfield%5D=${encodeURIComponent('Sort Date')}`
              + `&sort%5B0%5D%5Bdirection%5D=desc`
              + `&pageSize=100`;

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + (await res.text()));
      const json = await res.json();
      const records = json.records || [];
      grid.innerHTML = records.length
        ? records.map(r => buildCard(r.fields)).join('')
        : emptyMsg();
    } catch (e) {
      console.error('Airtable load failed:', e);
      grid.innerHTML = '<p class="car-dir__empty">Inventory failed to load. Please try again later.</p>';
    }

    updateFilterTabs();
    initDirectory();
  }

  /* ═══ Hide empty tabs; hide bar if pre-filtered to one type ═══ */
  function updateFilterTabs() {
    const bar = element.querySelector('.car-dir__filters');
    if (VEHICLE_FILTER) { if (bar) bar.style.display = 'none'; return; }  

    const present = new Set(
      Array.from(grid.querySelectorAll('.car-card'))
        .map(c => (c.getAttribute('data-category') || '').toLowerCase().trim())
        .filter(Boolean)
    );
    element.querySelectorAll('.filter-tab').forEach((btn) => {
      const f = (btn.getAttribute('data-filter') || '').toLowerCase();
      if (f === 'all') return;
      btn.style.display = present.has(f) ? '' : 'none';
    });
    if (bar) {
      bar.style.display = present.size ? '' : 'none';
      bar.style.visibility = present.size ? 'visible' : 'hidden';
    }
  }

  /* ═══ 3. BUILD ONE CARD ═══ */
  function buildCard(f) {
    const photos    = Array.isArray(f.Photos) ? f.Photos.map(p => p.url) : [];
    const main      = photos[0] || '';
    const make      = f.Make || '';
    const model     = f.Model || '';
    const category  = String(f['Vehicle Type'] || '').toLowerCase().trim();   // for filtering
    const typeLabel = String(f['Vehicle Type'] || '').trim();                 // original casing (SUV)
    const year      = (f.Year != null && f.Year !== '') ? String(f.Year) : '';
    const vin       = f.VIN || '';
    const trans = f.Transmission || f['Transmission Type'] || '';
    const drive = f['Drive Type'] || '';
    const desc      = f.Description || f['Listing Overview'] || '';
    const mileage   = f.Mileage ? Number(f.Mileage).toLocaleString() + ' miles' : '';
    const price     = f.Price   ? '$' + Number(f.Price).toLocaleString() : '';
    const location  = String(f.Location || '').split(',')[0].trim();         
    const title     = String(f.Title || '').trim();
    const extraPhotos = photos.slice(1).map((u, i) => `data-photo${i + 1}="${esc(u)}"`).join(' ');

    return `
      <div class="car-card"
           data-category="${esc(category)}" data-type-label="${esc(typeLabel)}"
           data-make="${esc(make)}" data-model="${esc(model)}"
           data-price="${esc(price)}" data-mileage="${esc(mileage)}"
           data-transmission="${esc(trans)}" data-drive="${esc(drive)}" data-year="${esc(year)}"
           data-description="${esc(desc)}" data-image="${esc(main)}"
           data-show-carfax="true" data-car-vin="${esc(vin)}"
           data-location="${esc(location)}" data-title="${esc(title)}" data-button-text="${esc(BUTTON_TEXT)}"
           data-modal-button-text="" data-modal-button-url="" ${extraPhotos}>
        <div class="car-card__img-wrap">
          <img class="car-card__img" src="${esc(main)}" alt="${esc(make)} ${esc(model)}" loading="lazy" />
          <div class="car-card__overlay"><span class="car-card__btn">${esc(BUTTON_TEXT)}</span></div>
        </div>
        <div class="car-card__info">
          <div class="car-card__name-row">
            <span class="car-card__name">${year ? esc(year) + ' ' : ''}${esc(make)} ${esc(model)}</span>
            <span class="car-card__price">${esc(price)}</span>
          </div>
          <div class="car-card__meta">
            ${mileage ? `<span class="car-card__meta-item">${ICON_MILEAGE}${esc(mileage)}</span>` : ''}
            ${pill(drive)}
            ${pill(trans)}
          </div>
        </div>
      </div>`;
  }

  /* ═══ 4. FILTERS + MODAL ═══ */
  function initDirectory() {
    const filterBtns  = element.querySelectorAll('.filter-tab');
    const cards       = element.querySelectorAll('.car-card');
    const modal       = element.querySelector('#carModal');
    const CARFAX_BASE_URL = 'https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=DVW_1&vin=';

    if (!filterBtns.length || !cards.length) return;

    let currentFilter = 'all';

    function filterCards(filter) {
      currentFilter = filter;
      cards.forEach((card) => {
        const cat  = (card.getAttribute('data-category') || '').toLowerCase().trim();
        const show = filter === 'all' || cat === filter;
        if (show) {
          card.classList.remove('hidden');
          card.style.opacity    = '1';
          card.style.transform  = '';
          card.style.transition = 'opacity 0.3s ease, transform 0.25s ease, box-shadow 0.25s ease';
        } else {
          card.style.opacity    = '0';
          card.style.transform  = 'scale(0.97)';
          card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
          setTimeout(() => {
            const stillFiltered =
              currentFilter !== 'all' &&
              (card.getAttribute('data-category') || '').toLowerCase().trim() !== currentFilter;
            if (stillFiltered) card.classList.add('hidden');
          }, 220);
        }
      });

      const anyVisible = Array.from(cards).some(c =>
        filter === 'all' || (c.getAttribute('data-category') || '').toLowerCase().trim() === filter
      );
      let emptyEl = grid.querySelector('.car-dir__empty--filter');
      if (!anyVisible) {
        if (!emptyEl) {
          emptyEl = document.createElement('p');
          emptyEl.className = 'car-dir__empty car-dir__empty--filter';
          emptyEl.textContent = 'There are currently no vehicles in our inventory matching this criteria.';
          grid.appendChild(emptyEl);
        }
      } else if (emptyEl) {
        emptyEl.remove();
      }

    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = (btn.getAttribute('data-filter') || 'all').toLowerCase();
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        filterCards(filter);
      });
    });

    cards.forEach((card) => { card.style.opacity = '1'; card.style.transform = ''; });

    if (!modal) return;

    const modalBackdrop    = modal.querySelector('.car-modal__backdrop');
    const modalClose       = modal.querySelector('.car-modal__close');
    const modalPrev        = modal.querySelector('#modalPrev');
    const modalNext        = modal.querySelector('#modalNext');
    const modalGallery     = modal.querySelector('#modalGallery');
    const modalGalleryGrid = modal.querySelector('#modalGalleryGrid');
    const modalCtaBtn      = modal.querySelector('#modalCtaBtn');
    const modalCarfax      = modal.querySelector('#modalCarfax');
    const modalActions     = modal.querySelector('#modalActions');

    let visibleCards = [];
    let currentIndex = -1;

    function getVisibleCards() {
      return Array.from(cards).filter((c) => !c.classList.contains('hidden'));
    }

    function updateNavArrows() {
      if (modalPrev) modalPrev.classList.toggle('is-hidden', currentIndex <= 0);
      if (modalNext) modalNext.classList.toggle('is-hidden', currentIndex >= visibleCards.length - 1);
    }

    function populateModal(card) {
      const make      = card.getAttribute('data-make')  || '';
      const model     = card.getAttribute('data-model') || '';
      const price     = card.getAttribute('data-price') || '';
      const mileage   = card.getAttribute('data-mileage') || '';
      const year      = card.getAttribute('data-year') || '';
      const description = card.getAttribute('data-description') || '';
      const transmission = card.getAttribute('data-transmission') || '';
      const drive        = card.getAttribute('data-drive') || '';
      const category  = card.getAttribute('data-category') || '';
      const typeLabel = card.getAttribute('data-type-label') || category;
      const titleCond = card.getAttribute('data-title') || '';
      const location  = card.getAttribute('data-location') || '';
      const image     = card.getAttribute('data-image') || '';
      const showCarfaxRaw = card.getAttribute('data-show-carfax') || '';
      const vinNumberRaw  = card.getAttribute('data-car-vin') || '';
      const showCarfax = ['true', '1', 'yes', 'on'].includes(showCarfaxRaw.toLowerCase());
      const vinNumber  = vinNumberRaw.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
      const carfaxUrl  = showCarfax && vinNumber ? CARFAX_BASE_URL + vinNumber : '';
      const modalButtonText = card.getAttribute('data-modal-button-text') || '';
      const modalButtonUrl  = card.getAttribute('data-modal-button-url') || '';
      

      /* Title now leads with the year */
      modal.querySelector('#modalCarName').textContent = (year ? year + ' ' : '') + make + ' ' + model;
      modal.querySelector('#modalPrice').textContent       = price;
      modal.querySelector('#modalDescription').textContent = description;
      modal.querySelector('#modalMileage').textContent     = mileage;
      modal.querySelector('#modalVin').textContent         = vinNumber;
      modal.querySelector('#modalTitle').textContent    = titleCond;
      const li = locInfo(location);

      const pillsEl = modal.querySelector('#modalPills');
      if (pillsEl) {
        pillsEl.innerHTML = pill(drive) + pill(transmission);
        pillsEl.style.display = (drive || transmission) ? '' : 'none';
      }

      /* Location tile → Google Maps link */
      const locEl = modal.querySelector('#modalLocation');
      locEl.textContent = location;
      if (li.maps) {
        locEl.href = li.maps;
        locEl.style.pointerEvents = '';
      } else {
        locEl.removeAttribute('href');
        locEl.style.pointerEvents = 'none';
      }

      const phonesEl = modal.querySelector('#modalPhones');
      if (phonesEl) {
        const nums = Array.isArray(li.phone) ? li.phone : (li.phone ? [li.phone] : []);
        phonesEl.innerHTML = nums.map(n => {
          const digits = String(n).replace(/[^0-9]/g, '');
          return `<a class="car-modal__phone" href="tel:${digits}" aria-label="Call ${esc(n)}">${PHONE_SVG}<span>${esc(n)}</span></a>`;
        }).join('');
        phonesEl.style.display = nums.length ? '' : 'none';
      }

      const imgEl   = modal.querySelector('#modalImg');
      const imgWrap = modal.querySelector('.car-modal__img-wrap');
      imgEl.removeAttribute('src');
      imgEl.removeAttribute('style');
      if (image) {
        imgWrap.style.display = '';
        imgEl.alt = make + ' ' + model;
        imgEl.src = image;
      } else {
        imgWrap.style.display = 'none';
      }

      /* Show/hide the four spec tiles */
      modal.querySelector('#modalSpecMileage').style.display  = mileage   ? '' : 'none';
      modal.querySelector('#modalSpecVin').style.display      = vinNumber ? '' : 'none';
      modal.querySelector('#modalSpecTitle').style.display    = titleCond ? '' : 'none';
      modal.querySelector('#modalSpecLocation').style.display = location  ? '' : 'none';

      if (modalCtaBtn) {
        if (modalButtonText && modalButtonUrl) {
          modalCtaBtn.textContent = modalButtonText; modalCtaBtn.href = modalButtonUrl;
          modalCtaBtn.classList.remove('is-hidden');
        } else if (modalButtonText) {
          modalCtaBtn.textContent = modalButtonText; modalCtaBtn.removeAttribute('href');
          modalCtaBtn.classList.remove('is-hidden');
        } else {
          modalCtaBtn.classList.add('is-hidden');
        }
      }

      if (modalCarfax) {
        if (carfaxUrl) { modalCarfax.href = carfaxUrl; modalCarfax.classList.remove('is-hidden'); }
        else modalCarfax.classList.add('is-hidden');
      }

      if (modalActions) {
        const ctaHidden = !modalButtonText && !modalButtonUrl;
        modalActions.classList.toggle('is-hidden', ctaHidden && !carfaxUrl);
      }

      /* Gallery + full-screen lightbox */
      if (modalGalleryGrid) {
        modalGalleryGrid.innerHTML = '';
        const galleryPhotos = [];
        let pi = 1, gsrc;
        while ((gsrc = card.getAttribute('data-photo' + pi)) !== null) {
          if (gsrc.trim() !== '') galleryPhotos.push(gsrc);
          pi++;
        }

        const allPhotos = (image ? [image] : []).concat(galleryPhotos);

        /* click the big hero image to open it full screen */
        if (imgEl && image) {
          imgEl.style.cursor = 'zoom-in';
          imgEl.onclick = () => openLightbox(allPhotos, 0);
        } else if (imgEl) {
          imgEl.onclick = null;
        }

        if (galleryPhotos.length > 0) {
          galleryPhotos.forEach((src, idx) => {
            const item = document.createElement('div');
            item.className = 'car-modal__gallery-item';
            const img = document.createElement('img');
            img.src = src;
            img.alt = make + ' ' + model + ' photo';
            img.loading = 'lazy';
            item.appendChild(img);
            const pos = image ? idx + 1 : idx;
            item.addEventListener('click', (e) => { e.stopPropagation(); openLightbox(allPhotos, pos); });
            modalGalleryGrid.appendChild(item);
          });
          if (modalGallery) modalGallery.classList.remove('is-hidden');
        } else {
          if (modalGallery) modalGallery.classList.add('is-hidden');
        }
      }
    }

    function openModal(card) {
      visibleCards = getVisibleCards();
      currentIndex = visibleCards.indexOf(card);
      populateModal(card);
      updateNavArrows();
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    function navigateTo(index) {
      if (index < 0 || index >= visibleCards.length) return;
      currentIndex = index;
      populateModal(visibleCards[currentIndex]);
      updateNavArrows();
      const dialog = modal.querySelector('.car-modal__dialog');
      if (dialog) dialog.scrollTop = 0;
    }

    cards.forEach((card) => card.addEventListener('click', () => openModal(card)));

    if (modalPrev) modalPrev.addEventListener('click', (e) => { e.stopPropagation(); navigateTo(currentIndex - 1); });
    if (modalNext) modalNext.addEventListener('click', (e) => { e.stopPropagation(); navigateTo(currentIndex + 1); });
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
    if (modalClose)    modalClose.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (lightbox && lightbox.classList.contains('is-open')) return;  
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowLeft')  navigateTo(currentIndex - 1);
      else if (e.key === 'ArrowRight') navigateTo(currentIndex + 1);
    });
  }

  /* ═══ 5. GO ═══ */
  loadInventory();

  } // end initWidget

  function boot() {
    injectCssOnce();
    const widgets = document.querySelectorAll('.car-dir-widget');
    if (!widgets.length) return;
    widgets.forEach(initWidget);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
