const state = {
  cart: []
};

function $(id) {
  return document.getElementById(id);
}

function showCategory(type) {
  $('dog').style.display = type === 'dog' ? 'grid' : 'none';
  $('cat').style.display = type === 'cat' ? 'grid' : 'none';
}

function addToCart(name, price) {
  const existing = state.cart.find((i) => i.name === name);
  if (existing) existing.qty += 1;
  else state.cart.push({ name, price, qty: 1 });
  updateCartUI();
  $('cart').classList.add('open');
}

function changeQty(name, delta) {
  const item = state.cart.find((i) => i.name === name);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter((i) => i.name !== name);
  updateCartUI();
}

function toggleCart() {
  $('cart').classList.toggle('open');
}

function money(n) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
}

function totals() {
  const subtotal = state.cart.reduce((sum, it) => sum + it.price * it.qty, 0);
  const discountRate = subtotal >= 30 ? 0.05 : 0;
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount;
  const count = state.cart.reduce((sum, it) => sum + it.qty, 0);
  return { subtotal, discountRate, discountAmount, total, count };
}

function updateBanner(total) {
  const banner = $('topBanner');
  let msg = '';
  if (total < 30) msg = `Noch ${money(30 - total)} bis 5% Rabatt`;
  else msg = '5% Rabatt aktiviert';
  banner.innerText = msg;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 3000);
}

function updateMini(count, total) {
  const mini = $('miniCart');
  if (count > 0) {
    mini.style.display = 'block';
    mini.innerText = `${count} | ${money(total)}`;
  } else {
    mini.style.display = 'none';
  }
}

function updateCartUI() {
  const container = $('cart-items');
  container.innerHTML = '';
  const { subtotal, discountRate, discountAmount, total, count } = totals();

  for (const item of state.cart) {
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-row__name">${item.name} (${item.qty})</div>
      <div class="cart-row__actions">
        <button class="qty-btn" type="button" data-name="${item.name}" data-delta="-1">-</button>
        <button class="qty-btn" type="button" data-name="${item.name}" data-delta="1">+</button>
      </div>
    `;
    container.appendChild(row);
  }

  container.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => changeQty(btn.dataset.name, Number(btn.dataset.delta)));
  });

  $('subtotal').innerText = subtotal.toFixed(2);
  $('discount').innerText = `-${discountAmount.toFixed(2)}`;
  $('discountLabel').innerText = `Rabatt (${Math.round(discountRate * 100)}%)`;
  $('total').innerText = total.toFixed(2);
  updateBanner(subtotal);
  updateMini(count, total);
}

function openAuthModal() {
  $('authModal').style.display = 'flex';
}
function closeAuthModal() {
  $('authModal').style.display = 'none';
}
function showGuestCheckout() {
  closeAuthModal();
  $('guestModal').style.display = 'flex';
}
function closeGuestModal() {
  $('guestModal').style.display = 'none';
}

async function checkout() {
  const name = $('name').value.trim();
  const email = $('email').value.trim();
  const pickup = $('pickup').value;
  const customerNotes = $('customerNotes')?.value?.trim?.() ?? '';
  const statusEl = $('guestStatus');
  const buyBtn = $('buyNow');

  if (!name || !email) {
    statusEl.innerText = 'Bitte Name und E-Mail eingeben.';
    return;
  }
  if (state.cart.length === 0) {
    statusEl.innerText = 'Warenkorb ist leer.';
    return;
  }

  const payload = { name, email, pickup, customer_notes: customerNotes, items: state.cart };

  try {
    statusEl.innerText = 'Bestellung wird gesendet...';
    buyBtn.disabled = true;
    const r = await fetch(`/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Checkout failed', data);
      statusEl.innerText =
        data?.error === 'EMAILJS_NON_BROWSER_DISABLED'
          ? 'EmailJS blockiert Server-API: im EmailJS Dashboard unter Account → Security "API access from non-browser environments" aktivieren.'
          : data?.error === 'EMAIL_SEND_FAILED'
            ? 'E-Mail Versand fehlgeschlagen. Bitte Keys prüfen oder später erneut versuchen.'
          : 'Bestellung fehlgeschlagen. Bitte später erneut versuchen.';
      return;
    }

    statusEl.innerText = '';
    alert(`Erfolg! Bestellung ${data.orderId} wurde aufgegeben und eine Bestätigung an ${email} gesendet.`);
    state.cart = [];
    updateCartUI();
    closeGuestModal();
    toggleCart();
  } catch (e) {
    console.error(e);
    statusEl.innerText = 'Netzwerkfehler. Läuft der Server? (API unter /api erreichbar)';
  } finally {
    buyBtn.disabled = false;
  }
}

function render() {
  document.querySelector('#app').innerHTML = `
    <div id="topBanner" class="top-banner"></div>

    <nav>
      <a href="/wer-sind-wir.html">Wer sind wir</a> |
      <a href="/geschichte.html">Geschichte</a> |
      <a href="/kontakt.html">Kontakt</a>
    </nav>

    <div class="container">
      <div class="categories">
        <div class="card" id="cat-dog">
          <img src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1" alt="Hunde" />
          <h3>Hunde</h3>
        </div>
        <div class="card" id="cat-cat">
          <img src="https://images.unsplash.com/photo-1518791841217-8f162f1e1131" alt="Katzen" />
          <h3>Katzen</h3>
        </div>
      </div>

      <div id="dog" class="products">
        <div class="product">
          <img src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1" alt="Rind & Kartoffel" />
          <h3>Rind & Kartoffel</h3>
          <p>14,90 €</p>
          <button class="btn" id="add-rind" type="button">In den Warenkorb</button>
        </div>
      </div>

      <div id="cat" class="products" style="display:none;">
        <div class="product">
          <img src="https://images.unsplash.com/photo-1518791841217-8f162f1e1131" alt="Lachs Menü" />
          <h3>Lachs Menü</h3>
          <p>12,50 €</p>
          <button class="btn" id="add-lachs" type="button">In den Warenkorb</button>
        </div>
      </div>
    </div>

    <button class="cart-toggle" id="cartToggle" type="button" aria-label="Warenkorb öffnen">🛒</button>
    <div class="mini" id="miniCart"></div>

    <div id="cart" class="cart" aria-label="Warenkorb">
      <button class="close" id="cartClose" type="button" aria-label="Warenkorb schließen">✖</button>
      <h3>Warenkorb</h3>
      <div id="cart-items"></div>
      <hr />
      <div>Zwischensumme: <span id="subtotal">0.00</span> €</div>
      <div><span id="discountLabel">Rabatt (0%)</span>: <span id="discount">-0.00</span> €</div>
      <strong>Total: <span id="total">0.00</span> €</strong>
      <hr />
      <button class="btn" id="checkoutBtn" type="button">Zur Kasse</button>
    </div>

    <div id="authModal" class="overlay" role="dialog" aria-modal="true">
      <div class="modal">
        <h3>Wie möchten Sie fortfahren?</h3>
        <button class="btn" type="button" id="loginSoon">Login / Registrieren</button>
        <button class="btn btn-secondary" type="button" id="guestBtn">Als Gast bestellen</button>
        <p id="cancelAuth" class="modal-cancel">Abbrechen</p>
      </div>
    </div>

    <div id="guestModal" class="overlay" role="dialog" aria-modal="true">
      <div class="modal">
        <h3>Kontaktdaten</h3>
        <input id="name" placeholder="Name" />
        <input id="email" placeholder="E-Mail" />
        <select id="pickup">
          <optgroup label="Märkte (9:00–14:30 Uhr)">
            <option value="kamen_fr">Kamen | Fr. </option>
            <option value="menden_di_fr">Menden | Di. und Fr. </option>
            <option value="hagen_boele_mi">Hagen-Boele | Mi. </option>
            <option value="hemer_mi_sa">Hemer | Mi. und Sa. </option>
            <option value="iserlohn_mi_sa">Iserlohn | Mi. und Sa. </option>
            <option value="neheim_mi_sa">Neheim | Mi. und Sa. </option>
            <option value="dortmund_brackel_do">Dortmund-Brackel | Do. </option>
            <option value="herdecke_do">Herdecke | Do. </option>
            <option value="hagen_friedrich_ebert_platz_fr">Hagen Friedrich-Ebert-Platz | Fr. </option>
            <option value="holzwickede_fr">Holzwickede | Fr. </option>
            <option value="unna_stockum_hofmarkt_fr_sa">Unna-Stockum (Hofmarkt) | Fr. und Sa. </option>
            <option value="unna_fr">Unna | Fr. </option>
            <option value="hagen_springe_sa">Hagen-Springe | Sa. </option>
            <option value="schwerte_fussgaengerzone_sa">Schwerte (Fußgängerzone) | Sa. </option>
          </optgroup>
          <optgroup label="Hofladen">
            <option value="hofladen_ardey_mo_sa_11">Hofladen Ardey | Mo.–Sa. ab 11:00 Uhr</option>
          </optgroup>
        </select>
        <textarea id="customerNotes" placeholder="Notizen (optional)" rows="3"></textarea>
        <div id="guestStatus" class="status" aria-live="polite"></div>
        <button class="btn" type="button" id="buyNow">Jetzt kaufen</button>
        <p id="cancelGuest" class="modal-cancel">Zurück</p>
      </div>
    </div>
  `;

  $('cat-dog').addEventListener('click', () => showCategory('dog'));
  $('cat-cat').addEventListener('click', () => showCategory('cat'));
  $('add-rind').addEventListener('click', () => addToCart('Rind', 14.9));
  $('add-lachs').addEventListener('click', () => addToCart('Lachs', 12.5));

  $('cartToggle').addEventListener('click', toggleCart);
  $('cartClose').addEventListener('click', toggleCart);
  $('checkoutBtn').addEventListener('click', openAuthModal);

  $('loginSoon').addEventListener('click', () => alert('Login Funktion folgt...'));
  $('guestBtn').addEventListener('click', showGuestCheckout);
  $('cancelAuth').addEventListener('click', closeAuthModal);

  $('cancelGuest').addEventListener('click', closeGuestModal);
  $('buyNow').addEventListener('click', checkout);

  updateCartUI();
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    body { margin: 0; font-family: Arial, sans-serif; background: #f5f7fa; overflow-x: hidden; }

    .top-banner {
      position: fixed; top: 0; width: 100%;
      background: black; color: white; text-align: center;
      padding: 10px; font-size: 14px;
      transform: translateY(-100%); transition: 0.3s; z-index: 1100;
    }
    .top-banner.show { transform: translateY(0); }

    nav { margin-top: 40px; background: white; padding: 15px; text-align: center; }
    nav a { color: #111; text-decoration: none; margin: 0 4px; }
    nav a:hover { text-decoration: underline; }

    .container { max-width: 1100px; margin: auto; padding: 20px; }

    .categories { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

    .card { height: 220px; border-radius: 12px; overflow: hidden; position: relative; cursor: pointer; }
    .card img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .card h3 { position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.6); color: white; margin: 0; padding: 10px; }

    .products { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; margin-top: 30px; }
    .product { background: white; padding: 15px; border-radius: 10px; text-align: center; }
    .product img { width: 100%; border-radius: 8px; }

    .btn {
      background: black; color: white;
      padding: 10px 12px; margin-top: 10px;
      border-radius: 6px; cursor: pointer; border: 0;
      width: 100%;
    }
    .btn-secondary { background: #555; }

    .cart-toggle {
      position: fixed; right: 20px; bottom: 20px;
      background: black; color: white;
      width: 48px; height: 48px; border-radius: 50%;
      z-index: 999; cursor: pointer; border: 0;
      display: grid; place-items: center;
    }

    .cart {
      position: fixed; right: -320px; top: 0;
      width: 300px; height: 100%;
      background: white; padding: 20px;
      transition: 0.3s; overflow-y: auto;
      z-index: 1000; box-shadow: -2px 0 5px rgba(0,0,0,0.1);
    }
    .cart.open { right: 0; }

    .close { position: absolute; right: 15px; top: 10px; cursor: pointer; background: transparent; border: 0; font-size: 16px; }

    .cart-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; }
    .cart-row__actions { display: flex; gap: 8px; }
    .qty-btn { border: 1px solid #ddd; background: #fff; border-radius: 6px; width: 34px; height: 30px; cursor: pointer; }

    .mini {
      position: fixed; right: 20px; bottom: 80px;
      background: white; padding: 10px;
      border-radius: 10px; display: none;
      font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }

    .overlay {
      display: none;
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 2000;
      justify-content: center; align-items: center;
      padding: 16px;
    }

    .modal {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      width: 100%;
      max-width: 400px;
      box-sizing: border-box;
    }
    .modal input, .modal select, .modal textarea {
      width: 100%;
      padding: 10px;
      margin-top: 10px;
      box-sizing: border-box;
    }
    .status { margin-top: 10px; font-size: 12px; color: #222; }
    .modal-cancel { cursor:pointer; font-size: 12px; margin-top: 15px; }
  `;
  document.head.appendChild(style);
}

injectStyles();
render();

