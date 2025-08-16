// assets/custom-sections.js
(function () {
    // Helpers
    function fetchProduct(handle) {
      return fetch('/products/' + encodeURIComponent(handle) + '.js').then(function (r) {
        if (!r.ok) throw new Error('Product not found: ' + handle);
        return r.json();
      });
    }
  
    function fallbackFormat(cents) {
      var value = (cents / 100).toFixed(2);
      var c = window.CE_SHOP_CURRENCY || '';
      return c ? value + ' ' + c : value;
    }
  
    function formatMoney(cents) {
      try {
        if (window.Shopify && typeof Shopify.formatMoney === 'function') {
          var fmt = (window.Shopify.money_format || '${{amount}}');
          return Shopify.formatMoney(cents, fmt);
        }
      } catch (e) {}
      return fallbackFormat(cents);
    }
  
    // Elements
    var quickview = document.getElementById('ce-quickview');
    if (!quickview) return;
  
    var qvImage = document.getElementById('ce-qv-image');
    var qvTitle = document.getElementById('ce-qv-title');
    var qvPrice = document.getElementById('ce-qv-price');
    var qvDesc = document.getElementById('ce-qv-desc');
    var qvVariants = document.getElementById('ce-qv-variants');
    var qvAdd = document.getElementById('ce-qv-add');
    var qvMessage = document.getElementById('ce-qv-message');
  
    var gridSection = document.querySelector('section.ce-grid');
    var autoAddHandle = gridSection ? gridSection.getAttribute('data-auto-add-handle') : null;
  
    function openQuickview(handle) {
      qvMessage.textContent = '';
      fetchProduct(handle)
        .then(function (p) {
          // Fill content
          qvImage.src = (p.images && p.images.length) ? p.images[0] : '';
          qvImage.alt = p.title || '';
          qvTitle.textContent = p.title || '';
          qvPrice.innerHTML = formatMoney(p.price || 0);
          qvDesc.innerHTML = p.description || '';
  
          // Variants
          qvVariants.innerHTML = '';
          (p.variants || []).forEach(function (v) {
            var opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = v.title; // e.g., "Black / Medium"
            qvVariants.appendChild(opt);
          });
  
          // Store handle for later
          qvAdd.dataset.productHandle = handle;
  
          // Show popup
          quickview.classList.add('open');
          quickview.setAttribute('aria-hidden', 'false');
        })
        .catch(function (err) {
          qvMessage.textContent = 'Failed to load product: ' + err.message;
          quickview.classList.add('open');
          quickview.setAttribute('aria-hidden', 'false');
        });
    }
  
    function closeQuickview() {
      quickview.classList.remove('open');
      quickview.setAttribute('aria-hidden', 'true');
    }
  
    function addToCart(variantId, qty) {
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(variantId), quantity: Number(qty || 1) })
      }).then(function (r) {
        if (!r.ok) throw new Error('Add to cart failed');
        return r.json();
      });
    }
  
    function maybeAutoAdd(variantText) {
      var txt = (variantText || '').toLowerCase();
      if (txt.includes('black') && txt.includes('medium') && autoAddHandle) {
        return fetchProduct(autoAddHandle).then(function (prod) {
          var v = (prod.variants && prod.variants[0]) ? prod.variants[0].id : null;
          if (!v) throw new Error('Auto-add product has no variants');
          return addToCart(v, 1);
        });
      }
      return Promise.resolve();
    }
  
    // Bind all quick view triggers (buttons with .js-qv-open)
    function bindTriggers(root) {
      (root || document).querySelectorAll('.js-qv-open').forEach(function (btn) {
        if (btn.__qvBound) return; // prevent double-binding
        btn.__qvBound = true;
        btn.addEventListener('click', function () {
          var handle = btn.getAttribute('data-handle') || (btn.closest('[data-product-handle]') && btn.closest('[data-product-handle]').getAttribute('data-product-handle'));
          if (handle) openQuickview(handle);
        });
      });
    }
  
    // Close handlers
    quickview.addEventListener('click', function (e) {
      if (
        e.target.matches('[data-action="close"]') ||
        e.target.classList.contains('ce-quickview__backdrop') ||
        e.target.classList.contains('ce-quickview__close')
      ) {
        closeQuickview();
      }
    });
  
    // Add to cart from popup
    if (qvAdd) {
      qvAdd.addEventListener('click', function () {
        var variantId = qvVariants.value;
        var variantText = qvVariants.options[qvVariants.selectedIndex] ? qvVariants.options[qvVariants.selectedIndex].text : '';
        if (!variantId) {
          qvMessage.textContent = 'Please select an option';
          return;
        }
        qvAdd.disabled = true;
        qvMessage.textContent = 'Adding to cart...';
  
        addToCart(variantId, 1)
          .then(function () { return maybeAutoAdd(variantText); })
          .then(function () {
            qvMessage.textContent = 'Added to cart!';
            qvAdd.disabled = false;
            setTimeout(closeQuickview, 900);
          })
          .catch(function (err) {
            qvMessage.textContent = 'Error: ' + (err.message || err);
            qvAdd.disabled = false;
          });
      });
    }
  
    // Initial bind and observe DOM changes (customizer, etc.)
    bindTriggers(document);
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) { if (m.addedNodes && m.addedNodes.length) bindTriggers(m.target); });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  })();
  