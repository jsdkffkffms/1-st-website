/* =========================================================
   NXORA — script.js
   ---------------------------------------------------------
   1. Settings you can edit (WhatsApp, form service)
   2. Helpers & device checks
   3. UI: nav, WhatsApp links, form, card tilt (works without 3D)
   4. Scroll effects on page content (GSAP ScrollTrigger)
   5. 3D scene (Three.js): mockups, sphere, N logo, particles,
      light trails, tunnel, particle-N intro, scroll-driven camera
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. SETTINGS — edit these
     --------------------------------------------------------- */
  var CONFIG = {
    whatsappNumber: '919142549122',
    whatsappMessage: 'Hello NXORA! I am interested in your services. I would like to discuss a project.',
    // Paste a form-service URL here (for example from Formspree: https://formspree.io/f/xxxxxxx).
    // While empty, the contact form opens WhatsApp with the visitor's details instead.
    formEndpoint: ''
  };
  var WA_URL = 'https://wa.me/' + CONFIG.whatsappNumber;
  function waLink(message) { return WA_URL + '?text=' + encodeURIComponent(message); }

  /* ---------------------------------------------------------
     2. HELPERS & DEVICE CHECKS
     --------------------------------------------------------- */
  var root = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
                 (navigator.deviceMemory && navigator.deviceMemory <= 2);
  var isMobile = window.matchMedia('(max-width: 768px)').matches || window.matchMedia('(pointer: coarse)').matches;
  // "lite" = lighter scene (fewer particles, no intro) for reduced motion or weak devices
  var lite = reduceMotion || !!lowPower;

  var hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  var hasTHREE = typeof THREE !== 'undefined';

  function webglAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  /* ---------------------------------------------------------
     3. UI — works even if 3D is unavailable
     --------------------------------------------------------- */
  function initUI() {
    if (reduceMotion) document.body.classList.add('reduced');

    // WhatsApp links: add the pre-filled message to the exact wa.me URL
    $$('[data-wa]').forEach(function (a) {
      a.href = waLink(CONFIG.whatsappMessage);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });

    var year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    // Header gets a dark glass background after scrolling a little
    var header = $('.site-header');
    function onScroll() { header.classList.toggle('scrolled', window.scrollY > 40); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile menu
    var toggle = $('.nav-toggle');
    var nav = $('#nav');
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('#nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Highlight the nav link of the section currently on screen
    var links = $$('#nav a');
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        // "Process" has no nav link, so it keeps "Services" highlighted
        var key = id === 'process' ? 'services' : id;
        links.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + key); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });

    initTilt();
    initForm();
  }

  /* 3D tilt + moving glow on the service cards */
  function initTilt() {
    if (reduceMotion) return;
    $$('.tilt').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* Contact form: validate, then send to a form service or fall back to WhatsApp */
  function initForm() {
    var form = $('#contactForm');
    var status = $('#formStatus');
    if (!form) return;

    function say(text, kind) {
      status.textContent = text;
      status.className = 'form-status' + (kind ? ' ' + kind : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements; // named access (avoids clashing with the form's own "name")
      var data = {
        name: f['name'].value.trim(),
        email: f['email'].value.trim(),
        service: f['service'].value,
        details: f['details'].value.trim()
      };

      // Simple validation
      var bad = [];
      if (!data.name) bad.push(f['name']);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) bad.push(f['email']);
      if (!data.service) bad.push(f['service']);
      if (!data.details) bad.push(f['details']);
      [f['name'], f['email'], f['service'], f['details']].forEach(function (field) { field.classList.remove('invalid'); });
      if (bad.length) {
        bad.forEach(function (field) { field.classList.add('invalid'); });
        bad[0].focus();
        say('Please fill in every field with a valid email address.', 'err');
        return;
      }

      var message = 'Hello NXORA! I am ' + data.name + '. I need: ' + data.service + '.\n\n' +
                    'Project details: ' + data.details + '\n\nMy email: ' + data.email;

      if (CONFIG.formEndpoint) {
        // A form service is configured: send the message there
        say('Sending…', '');
        fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (res) {
          if (!res.ok) throw new Error('Request failed');
          form.reset();
          say('Thank you! Your message was sent. We will reply soon.', 'ok');
        }).catch(function () {
          say('The message could not be sent. Please use the WhatsApp button instead.', 'err');
        });
      } else {
        // No backend yet: open WhatsApp with the details pre-filled
        say('Opening WhatsApp with your details…', 'ok');
        window.open(waLink(message), '_blank', 'noopener');
      }
    });
  }

  /* ---------------------------------------------------------
     4. SCROLL EFFECTS ON PAGE CONTENT (GSAP ScrollTrigger)
     --------------------------------------------------------- */
  function initDomScroll() {
    gsap.registerPlugin(ScrollTrigger);

    // Hero text fades out at the end of the pinned hero scroll
    gsap.to('.hero-copy', {
      opacity: 0, y: -50, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'bottom 135%', end: 'bottom 100%', scrub: true }
    });
    // "Scroll to explore" cue disappears as soon as scrolling begins
    gsap.to('.scroll-cue', {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=200', scrub: true }
    });

    // Headings and blocks glide in once
    $$('.reveal').forEach(function (el) {
      gsap.from(el, {
        y: 46, opacity: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      });
    });

    // Service cards swing up from a tilted position as you scroll (scrubbed, not time-based)
    $$('.service-card').forEach(function (card, i) {
      gsap.fromTo(card,
        { rotationX: 30, y: 130, opacity: 0, transformPerspective: 1000, transformOrigin: '50% 100%' },
        {
          rotationX: 0, y: 0, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: card, start: 'top ' + (102 - i * 4) + '%', end: 'top 55%', scrub: 0.6 }
        });
    });

    // Process timeline: the red line grows with scroll and lights each step
    var steps = $('.steps');
    var items = $$('.step');
    ScrollTrigger.create({
      trigger: steps, start: 'top 75%', end: 'bottom 60%', scrub: true,
      onUpdate: function (self) {
        steps.style.setProperty('--p', self.progress.toFixed(3));
        items.forEach(function (s, i) {
          s.classList.toggle('on', self.progress >= i / (items.length - 1) - 0.02);
        });
      }
    });
  }

  /* Fallback when GSAP fails to load: simple fade-ins via IntersectionObserver */
  function initPlainReveal() {
    document.body.classList.add('reveal-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
    $$('.step').forEach(function (s) { s.classList.add('on'); });
  }

  /* ---------------------------------------------------------
     5. 3D SCENE
     --------------------------------------------------------- */
  function init3D() {
    var canvas = $('#scene');
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true, antialias: !lite && !isMobile, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1 : (isMobile ? 1.5 : 2)));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 120);
    var portrait = window.innerWidth / window.innerHeight < 0.95;

    /* ----- lights ----- */
    scene.add(new THREE.AmbientLight(0x662828, 1.0));
    var keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    keyLight.position.set(-3, 4, 6);
    scene.add(keyLight);
    var redLight = new THREE.PointLight(0xff1a2a, 2.4, 28, 1.5); // follows the glowing sphere
    scene.add(redLight);

    /* ----- texture helpers ----- */
    var repaintList = [];
    function screenTexture(w, h, draw) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var g = c.getContext('2d');
      var tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      function paint() { draw(g, w, h); tex.needsUpdate = true; }
      paint();
      repaintList.push(paint); // repainted once fonts have loaded
      return tex;
    }
    function radialTexture(stops) {
      var c = document.createElement('canvas');
      c.width = c.height = 128;
      var g = c.getContext('2d');
      var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    var glowTex = radialTexture([[0, 'rgba(255,70,80,1)'], [0.25, 'rgba(255,31,45,0.55)'], [1, 'rgba(255,31,45,0)']]);
    var dotTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,90,100,0.9)'], [1, 'rgba(255,31,45,0)']]);
    function glowSprite(size, opacity) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, transparent: true, opacity: opacity, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      s.scale.set(size, size, 1);
      return s;
    }
    function rrect(g, x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }
    var F = '"Syne", "Segoe UI", Arial, sans-serif';
    var B = '"Manrope", "Segoe UI", Arial, sans-serif';

    /* What the desktop mockup's screen shows (a tiny NXORA website) */
    var siteTex = screenTexture(1024, 640, function (g, w, h) {
      g.fillStyle = '#08080a'; g.fillRect(0, 0, w, h);
      var gr = g.createRadialGradient(w * 0.78, h * 0.4, 0, w * 0.78, h * 0.4, w * 0.5);
      gr.addColorStop(0, 'rgba(255,31,45,0.32)'); gr.addColorStop(1, 'rgba(255,31,45,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // nav
      g.fillStyle = '#e0111f'; rrect(g, 40, 30, 26, 32, 5); g.fill();
      g.fillStyle = '#fff'; g.font = '800 22px ' + F; g.textBaseline = 'middle'; g.fillText('NXORA', 80, 47);
      g.fillStyle = '#9a9094'; g.font = '600 17px ' + B;
      ['Home', 'About', 'Services', 'Contact'].forEach(function (t, i) { g.fillText(t, 560 + i * 92, 47); });
      g.fillStyle = '#ff1f2d'; rrect(g, 900, 28, 100, 38, 19); g.fill();
      // headline
      g.textBaseline = 'alphabetic';
      g.fillStyle = '#fff'; g.font = '800 92px ' + F; g.fillText('Build.', 56, 210); g.fillText('Create.', 56, 300);
      g.fillStyle = '#ff1f2d'; g.fillText('Inspire.', 56, 390);
      g.fillStyle = '#a89da0'; g.font = '500 20px ' + B; g.fillText('Websites, video and design for brands that move fast.', 58, 436);
      g.fillStyle = '#fff'; rrect(g, 58, 462, 150, 46, 23); g.fill();
      g.strokeStyle = '#6a6064'; g.lineWidth = 2; rrect(g, 224, 462, 150, 46, 23); g.stroke();
      // glowing orb
      var og = g.createRadialGradient(780, 260, 10, 780, 260, 150);
      og.addColorStop(0, '#ff6b76'); og.addColorStop(0.3, '#ff1f2d'); og.addColorStop(0.7, 'rgba(255,31,45,0.15)'); og.addColorStop(1, 'rgba(255,31,45,0)');
      g.fillStyle = og; g.beginPath(); g.arc(780, 260, 150, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,90,100,0.55)'; g.lineWidth = 2;
      [100, 130].forEach(function (r) { g.beginPath(); g.arc(780, 260, r, 0, Math.PI * 2); g.stroke(); });
      // service cards
      ['Web Development', 'Video Editing', 'Brand Design'].forEach(function (t, i) {
        var x = 56 + i * 312;
        g.fillStyle = 'rgba(255,255,255,0.06)'; rrect(g, x, 530, 290, 84, 14); g.fill();
        g.strokeStyle = 'rgba(255,64,76,0.35)'; g.lineWidth = 1.5; rrect(g, x, 530, 290, 84, 14); g.stroke();
        g.fillStyle = '#ff1f2d'; g.beginPath(); g.arc(x + 40, 572, 16, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.font = '700 21px ' + F; g.fillText(t, x + 72, 580);
      });
    });

    /* Phone screen */
    var phoneTex = screenTexture(360, 720, function (g, w, h) {
      g.fillStyle = '#08080a'; g.fillRect(0, 0, w, h);
      var gr = g.createRadialGradient(w * 0.8, h * 0.18, 0, w * 0.8, h * 0.18, w * 0.8);
      gr.addColorStop(0, 'rgba(255,31,45,0.35)'); gr.addColorStop(1, 'rgba(255,31,45,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e0111f'; rrect(g, 24, 38, 20, 26, 4); g.fill();
      g.fillStyle = '#fff'; g.font = '800 20px ' + F; g.textBaseline = 'middle'; g.fillText('NXORA', 54, 52);
      g.textBaseline = 'alphabetic';
      g.font = '800 68px ' + F; g.fillStyle = '#fff'; g.fillText('Build.', 24, 190); g.fillText('Create.', 24, 256);
      g.fillStyle = '#ff1f2d'; g.fillText('Inspire.', 24, 322);
      g.fillStyle = '#ff1f2d'; rrect(g, 24, 352, 150, 44, 22); g.fill();
      ['Web Development', 'Video Editing', 'Brand Design'].forEach(function (t, i) {
        var y = 440 + i * 80;
        g.fillStyle = 'rgba(255,255,255,0.06)'; rrect(g, 24, y, 312, 66, 12); g.fill();
        g.strokeStyle = 'rgba(255,64,76,0.35)'; g.lineWidth = 1.5; rrect(g, 24, y, 312, 66, 12); g.stroke();
        g.fillStyle = '#ff1f2d'; g.beginPath(); g.arc(56, y + 33, 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.font = '700 19px ' + F; g.fillText(t, 84, y + 40);
      });
    });

    /* Dark "code window" floating beside the desktop (like the reference video) */
    var codeTex = screenTexture(512, 640, function (g, w, h) {
      g.fillStyle = '#0a0a0d'; g.fillRect(0, 0, w, h);
      ['#ff1f2d', '#555', '#555'].forEach(function (c, i) { g.fillStyle = c; g.beginPath(); g.arc(30 + i * 22, 30, 7, 0, Math.PI * 2); g.fill(); });
      var rows = [[0, 220, '#ff1f2d'], [1, 300, '#e9e2e3'], [1, 180, '#8b8185'], [2, 260, '#e9e2e3'], [2, 140, '#ff6b76'], [1, 330, '#8b8185'],
                  [0, 200, '#ff1f2d'], [1, 280, '#e9e2e3'], [2, 220, '#8b8185'], [2, 300, '#e9e2e3'], [1, 120, '#ff6b76'], [0, 160, '#8b8185'],
                  [1, 310, '#e9e2e3'], [2, 190, '#8b8185'], [0, 240, '#ff1f2d']];
      rows.forEach(function (r, i) { g.fillStyle = r[2]; g.globalAlpha = 0.85; rrect(g, 40 + r[0] * 28, 80 + i * 34, r[1], 12, 6); g.fill(); });
      g.globalAlpha = 1;
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { repaintList.forEach(function (p) { p(); }); });
    }

    /* ----- object: desktop mockup ----- */
    var edgeMat = function (op) {
      return new THREE.LineBasicMaterial({ color: 0xff2433, transparent: true, opacity: op, blending: THREE.AdditiveBlending });
    };
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x101014, metalness: 0.7, roughness: 0.35 });

    var desk = new THREE.Group();
    var deskBodyGeo = new THREE.BoxGeometry(4.4, 2.75, 0.12);
    desk.add(new THREE.Mesh(deskBodyGeo, bodyMat));
    desk.add(new THREE.LineSegments(new THREE.EdgesGeometry(deskBodyGeo), edgeMat(0.7)));
    var deskScreen = new THREE.Mesh(new THREE.PlaneGeometry(4.08, 2.55), new THREE.MeshBasicMaterial({ map: siteTex, toneMapped: false }));
    deskScreen.position.z = 0.065;
    desk.add(deskScreen);
    var deskHalo = glowSprite(8.5, 0.32); deskHalo.position.z = -0.8; desk.add(deskHalo);
    var panel = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.5), new THREE.MeshBasicMaterial({ map: codeTex, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    panel.position.set(-2.95, -0.5, -0.8);
    panel.rotation.y = 0.45;
    desk.add(panel);
    var panelEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.0, 2.5)), edgeMat(0.5));
    panelEdge.position.copy(panel.position); panelEdge.rotation.copy(panel.rotation);
    desk.add(panelEdge);
    scene.add(desk);

    /* ----- object: phone mockup ----- */
    var phone = new THREE.Group();
    var phoneGeo = new THREE.BoxGeometry(1.15, 2.2, 0.1);
    phone.add(new THREE.Mesh(phoneGeo, bodyMat));
    phone.add(new THREE.LineSegments(new THREE.EdgesGeometry(phoneGeo), edgeMat(0.8)));
    var phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.03, 2.06), new THREE.MeshBasicMaterial({ map: phoneTex, toneMapped: false }));
    phoneScreen.position.z = 0.055;
    phone.add(phoneScreen);
    var phoneHalo = glowSprite(4, 0.3); phoneHalo.position.z = -0.5; phone.add(phoneHalo);
    scene.add(phone);

    /* ----- object: glowing red energy sphere ----- */
    var sphere = new THREE.Group();
    sphere.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 40, 40), new THREE.MeshBasicMaterial({ color: 0xff2a38 })));
    sphere.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff8890 })));
    sphere.add(glowSprite(7, 0.95));
    var ringA = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: 0xff5560, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
    var ringB = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.01, 8, 120), new THREE.MeshBasicMaterial({ color: 0xff2a38, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
    ringA.rotation.x = 1.1; ringB.rotation.set(0.5, 0.6, 0);
    sphere.add(ringA); sphere.add(ringB);
    scene.add(sphere);

    /* ----- object: extruded 3D "N" logo (About section) ----- */
    var N_POINTS = [[0, 0], [0, 2], [0.45, 2], [1.15, 0.85], [1.15, 2], [1.6, 2], [1.6, 0], [1.15, 0], [0.45, 1.15], [0.45, 0]];
    var nShape = new THREE.Shape();
    N_POINTS.forEach(function (p, i) { if (i === 0) nShape.moveTo(p[0], p[1]); else nShape.lineTo(p[0], p[1]); });
    nShape.closePath();
    var nGeo = new THREE.ExtrudeGeometry(nShape, { depth: 0.38, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3 });
    nGeo.center();
    var logoN = new THREE.Group();
    logoN.add(new THREE.Mesh(nGeo, new THREE.MeshStandardMaterial({ color: 0xd2101e, emissive: 0x3d040a, metalness: 0.55, roughness: 0.28 })));
    var nHalo = glowSprite(6.5, 0.45); nHalo.position.z = -0.6; logoN.add(nHalo);
    scene.add(logoN);

    /* ----- ambient red particles (drift + parallax) ----- */
    var AMB = lite ? 500 : (isMobile ? 1000 : 2200);
    var ambPos = new Float32Array(AMB * 3);
    for (var a = 0; a < AMB; a++) {
      ambPos[a * 3] = (Math.random() - 0.5) * 44;
      ambPos[a * 3 + 1] = (Math.random() - 0.5) * 26;
      ambPos[a * 3 + 2] = 8 - Math.random() * 46;
    }
    var ambGeo = new THREE.BufferGeometry();
    ambGeo.setAttribute('position', new THREE.BufferAttribute(ambPos, 3));
    var ambient = new THREE.Points(ambGeo, new THREE.PointsMaterial({
      map: dotTex, size: 0.11, color: 0xff3040, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    scene.add(ambient);

    /* ----- red light trails orbiting the mockups ----- */
    var TRAILS = lite ? 3 : 6;
    var TLEN = 40;
    var trailGroup = new THREE.Group();
    var trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    var trails = [];
    for (var t = 0; t < TRAILS; t++) {
      var tg = new THREE.BufferGeometry();
      var tp = new Float32Array(TLEN * 3);
      var tc = new Float32Array(TLEN * 3);
      for (var j = 0; j < TLEN; j++) {
        var f = 1 - j / (TLEN - 1);
        tc[j * 3] = f; tc[j * 3 + 1] = 0.12 * f; tc[j * 3 + 2] = 0.18 * f;
      }
      tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
      tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
      var line = new THREE.Line(tg, trailMat);
      line.frustumCulled = false;
      line.rotation.z = (t / TRAILS) * Math.PI - 0.6;
      var head = glowSprite(0.55, 0.9);
      trailGroup.add(line, head);
      trails.push({
        pos: tp, geo: tg, head: head,
        rx: 3.4 + (t % 3) * 0.9, ry: 1.8 + (t % 2) * 0.9, rz: 1.2 + (t % 3) * 0.5,
        speed: 0.55 + t * 0.09, phase: t * 1.1, dir: t % 2 ? -1 : 1
      });
    }
    scene.add(trailGroup);

    /* ----- tunnel of red rings (Process section fly-through) ----- */
    var RINGS = 14, SPACING = 4.2, SPAN = RINGS * SPACING;
    var tunnel = new THREE.Group();
    var tunnelMat = new THREE.MeshBasicMaterial({ color: 0xff2a38, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    var tunnelRings = [];
    for (var r = 0; r < RINGS; r++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(5 + (r % 3) * 0.7, 0.014, 6, 90), tunnelMat);
      ring.rotation.z = Math.random() * 6;
      tunnel.add(ring);
      tunnelRings.push(ring);
    }
    scene.add(tunnel);

    /* ----- intro particles that gather into a 3D "N" ----- */
    var intro = { active: false, form: 0, burst: 0, camZ: 12, mix: 1 };
    var introPts = null, introData = null;

    function buildIntroParticles() {
      var COUNT = isMobile ? 5500 : 10000;
      // Draw the N shape on a hidden canvas, then pick random points inside it
      var W = 320, H = 400;
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d');
      g.fillStyle = '#fff'; g.beginPath();
      N_POINTS.forEach(function (p, i) {
        var px = 40 + (p[0] / 1.6) * 240, py = 50 + ((2 - p[1]) / 2) * 300;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      });
      g.closePath(); g.fill();
      var img = g.getImageData(0, 0, W, H).data;

      var pos = new Float32Array(COUNT * 3), start = new Float32Array(COUNT * 3), target = new Float32Array(COUNT * 3);
      var dir = new Float32Array(COUNT * 3), delay = new Float32Array(COUNT), col = new Float32Array(COUNT * 3);
      var scale = 1.7; // N is 3.4 units tall
      for (var i = 0; i < COUNT; i++) {
        var rx, ry, tries = 0;
        do { rx = Math.random() * W; ry = Math.random() * H; tries++; }
        while (img[((ry | 0) * W + (rx | 0)) * 4 + 3] < 128 && tries < 200);
        target[i * 3] = ((rx - W / 2) / 240) * 1.6 * scale;
        target[i * 3 + 1] = -((ry - H / 2) / 300) * 2 * scale + 0.6;
        target[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
        // start scattered around the screen
        var ang = Math.random() * Math.PI * 2, rad = 5 + Math.random() * 10;
        start[i * 3] = Math.cos(ang) * rad * 1.3;
        start[i * 3 + 1] = Math.sin(ang) * rad * 0.8;
        start[i * 3 + 2] = (Math.random() - 0.5) * 16;
        // direction used when the N bursts apart
        dir[i * 3] = (Math.random() - 0.5) * 2; dir[i * 3 + 1] = (Math.random() - 0.5) * 2; dir[i * 3 + 2] = Math.random() * 1.5;
        delay[i] = Math.random() * 0.5;
        var br = 0.45 + Math.random() * 0.55;
        col[i * 3] = br; col[i * 3 + 1] = br * 0.1; col[i * 3 + 2] = br * 0.14;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      introPts = new THREE.Points(geo, new THREE.PointsMaterial({
        map: dotTex, size: 0.06, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      introPts.frustumCulled = false;
      introData = { pos: pos, start: start, target: target, dir: dir, delay: delay, count: COUNT, geo: geo };
      scene.add(introPts);
    }

    function updateIntroParticles(time) {
      var d = introData, f = intro.form, burst = intro.burst * intro.burst * 16;
      for (var i = 0; i < d.count; i++) {
        var i3 = i * 3;
        var k = clamp(f * 1.5 - d.delay[i], 0, 1);
        var e = k * k * (3 - 2 * k);
        var wob = (1 - e) * 0.35 * Math.sin(time * 1.6 + i);
        var shimmer = e * 0.012 * Math.sin(time * 2.4 + i * 0.7);
        d.pos[i3] = d.start[i3] + (d.target[i3] - d.start[i3]) * e + wob + shimmer + d.dir[i3] * burst;
        d.pos[i3 + 1] = d.start[i3 + 1] + (d.target[i3 + 1] - d.start[i3 + 1]) * e + wob + shimmer + d.dir[i3 + 1] * burst;
        d.pos[i3 + 2] = d.start[i3 + 2] + (d.target[i3 + 2] - d.start[i3 + 2]) * e + d.dir[i3 + 2] * burst;
      }
      d.geo.attributes.position.needsUpdate = true;
      introPts.material.opacity = 1 - clamp(intro.burst * 1.2, 0, 1);
    }

    /* ----- scroll-driven "state" -----
       S holds every animated value. The GSAP timeline (built below) tweens S
       as you scroll; the render loop then applies S to the 3D objects.     */
    var base = {
      camX: 0, camY: 0, camZ: 9, lkX: 0, lkY: 0, lkZ: 0, camRoll: 0,
      dX: 0, dY: 0, dZ: -7, dRX: 0, dRY: 0, dRZ: 0, dS: 0.5,
      pX: 0, pY: 0, pZ: -7, pRX: 0, pRY: 0, pRZ: 0, pS: 0.5,
      sX: 0, sY: 0, sZ: -9, sS: 1,
      nX: 0, nY: 0, nZ: -6, nRY: 0, nS: 0.001,
      trailOp: 0.4, tunnelOp: 0, tunnel: 0
    };
    function kf(over) { return Object.assign({}, base, over); }

    function buildKeyframes() {
      var k = [
        // 0 · hero start: big desktop on the right, phone waiting off-screen
        kf({ camZ: 10, lkX: 0.3, dX: 2.6, dY: 0.1, dZ: 0, dRX: 0.05, dRY: -0.5, dS: 1, pX: 6.8, pY: -1, pZ: 1, pRY: -0.6, pS: 1, sX: 2.8, sY: 0.2, sZ: -2.6, sS: 1, trailOp: 1 }),
        // 1 · hero end: camera pushes in, desktop rotates, phone slides into view
        kf({ camX: 0.4, camY: 0.1, camZ: 8, lkX: 0.6, dX: 2.4, dY: 0.15, dZ: 0, dRX: 0.12, dRY: 0.6, dRZ: 0.02, dS: 1.05, pX: 4.5, pY: -0.8, pZ: 1.7, pRX: 0.05, pRY: -0.35, pRZ: 0.04, pS: 1, sX: 2.9, sY: 0.2, sZ: -2.6, sS: 1.35, trailOp: 1 }),
        // 2 · about: mockups drift away, the 3D N logo takes the stage
        kf({ camZ: 9, dX: -5.6, dY: -1.7, dZ: -4, dRY: 0.9, dS: 0.6, pX: -7, pY: 2, pZ: -5, pRY: 0.7, pS: 0.5, sX: -3.8, sY: 1.2, sZ: -6, sS: 0.8, nX: 3, nY: 0, nZ: 0, nRY: 0.4, nS: 1.25, trailOp: 0.3 }),
        // 3 · services: camera rolls slightly, big glow sits behind the cards
        kf({ camY: -0.3, camZ: 10, camRoll: 0.05, dX: -6.5, dY: 2, dZ: -8, dRX: 0.3, dRY: 1.1, dS: 0.55, pX: 6.5, pY: 1.5, pZ: -8, pRY: -1, pS: 0.5, sX: 0, sY: 0, sZ: -9, sS: 2.4, nX: 0, nY: 5, nZ: -10, nS: 0.5, trailOp: 0.5, tunnel: 0 }),
        // 4 · process: fly through a tunnel of red rings toward the glow
        kf({ camZ: 9, camRoll: 0, dX: -7, dY: 2, dZ: -9, dS: 0.4, pX: 7, pY: -2, pZ: -9, pS: 0.4, sX: 0, sY: 0, sZ: -16, sS: 2, trailOp: 0.15, tunnelOp: 1, tunnel: 18 }),
        // 5 · contact: mockups return, calm and glowing
        kf({ camZ: 9, lkX: 0.3, dX: 3.4, dY: -0.5, dZ: -1.5, dRX: 0.1, dRY: -0.5, dS: 0.85, pX: 5.7, pY: -1.3, pZ: 0, pRY: -0.4, pS: 0.8, sX: 3.5, sY: 0.3, sZ: -3.2, sS: 1.5, trailOp: 0.8, tunnel: 34 })
      ];
      if (portrait) {
        // Phones/tablets in portrait: pull everything toward the centre
        k.forEach(function (s) { ['dX', 'pX', 'sX', 'nX', 'lkX'].forEach(function (key) { s[key] *= 0.3; }); });
      }
      return k;
    }

    var kfs = buildKeyframes();
    var S = Object.assign({}, kfs[0]);
    var R = { v: 0 };   // hero reveal 0 → 1 (objects grow in after the intro)
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    if (!lite) {
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
      });
    }

    /* Apply the state S to the 3D objects (runs every frame) */
    var lookV = new THREE.Vector3(), introLook = new THREE.Vector3(0, 0.6, 0);
    function apply(time) {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      var rv = R.v;

      // camera: blend between the intro camera and the scroll camera
      var sx = S.camX + mouse.x * 0.35, sy = S.camY + mouse.y * 0.2, sz = S.camZ + (portrait ? 2.6 : 0);
      var ix = Math.sin(time * 0.4) * 0.6, iy = 0.3, iz = intro.camZ;
      var m = intro.mix;
      camera.position.set(ix + (sx - ix) * m, iy + (sy - iy) * m, iz + (sz - iz) * m);
      camera.up.set(Math.sin(S.camRoll), Math.cos(S.camRoll), 0);
      lookV.set(introLook.x + (S.lkX - introLook.x) * m, introLook.y + ((S.lkY + (portrait ? 1.3 : 0)) - introLook.y) * m, introLook.z + (S.lkZ - introLook.z) * m);
      camera.lookAt(lookV);

      // desktop mockup
      desk.visible = rv > 0.001;
      desk.position.set(S.dX, S.dY + Math.sin(time * 0.9) * 0.09 - (1 - rv) * 1.2, S.dZ);
      desk.rotation.set(S.dRX + mouse.y * 0.05, S.dRY + mouse.x * 0.1 + Math.sin(time * 0.5) * 0.03, S.dRZ);
      desk.scale.setScalar(Math.max(0.001, S.dS * rv));

      // phone mockup
      phone.visible = rv > 0.001;
      phone.position.set(S.pX, S.pY + Math.sin(time * 1.1 + 1.2) * 0.1 - (1 - rv) * 1.2, S.pZ);
      phone.rotation.set(S.pRX, S.pRY + mouse.x * 0.12, S.pRZ + Math.sin(time * 0.7) * 0.02);
      phone.scale.setScalar(Math.max(0.001, S.pS * rv));

      // glowing sphere (+ the red point light that follows it)
      sphere.visible = rv > 0.001;
      sphere.position.set(S.sX, S.sY + Math.sin(time * 0.8) * 0.08, S.sZ);
      sphere.scale.setScalar(Math.max(0.001, S.sS * rv * (1 + Math.sin(time * 2.2) * 0.025)));
      ringA.rotation.z = time * 0.5; ringB.rotation.z = -time * 0.35;
      redLight.position.set(S.sX, S.sY, S.sZ + 1.5);

      // 3D N logo
      logoN.visible = S.nS > 0.01;
      logoN.position.set(S.nX, S.nY + Math.sin(time * 0.9) * 0.12, S.nZ);
      logoN.rotation.set(Math.sin(time * 0.5) * 0.08, S.nRY + Math.sin(time * 0.6) * 0.55, 0);
      logoN.scale.setScalar(Math.max(0.001, S.nS));

      // particles & trails
      ambient.rotation.y = time * 0.015 + S.camX * 0.02;
      ambient.position.y = Math.sin(time * 0.2) * 0.4;
      trailGroup.visible = rv > 0.001 && S.trailOp > 0.02;
      trailGroup.position.set(S.dX, S.dY, S.dZ);
      trailGroup.scale.setScalar(Math.max(0.001, S.dS * 1.0));
      trailMat.opacity = S.trailOp;
      trails.forEach(function (tr) {
        for (var j = 0; j < TLEN; j++) {
          var ang = tr.phase + (time * tr.speed - j * 0.05) * tr.dir;
          tr.pos[j * 3] = Math.cos(ang) * tr.rx;
          tr.pos[j * 3 + 1] = Math.sin(ang) * tr.ry * 0.7;
          tr.pos[j * 3 + 2] = Math.sin(ang * 1.3) * tr.rz;
        }
        tr.geo.attributes.position.needsUpdate = true;
        tr.head.position.set(tr.pos[0], tr.pos[1], tr.pos[2]);
        tr.head.position.applyEuler(trailLineEuler(tr));
        tr.head.material.opacity = S.trailOp;
      });

      // tunnel
      tunnel.visible = S.tunnelOp > 0.01;
      tunnelMat.opacity = S.tunnelOp * 0.75;
      for (var q = 0; q < RINGS; q++) {
        var z = -(((q * SPACING - S.tunnel) % SPAN) + SPAN) % SPAN;
        tunnelRings[q].position.z = z + 2;
      }
    }
    // Each trail line is rotated around Z; its glowing head must follow the same rotation
    var _eul = new THREE.Euler();
    function trailLineEuler(tr) {
      var idx = trails.indexOf(tr);
      _eul.set(0, 0, (idx / TRAILS) * Math.PI - 0.6);
      return _eul;
    }

    /* ----- render loop ----- */
    var clock = new THREE.Clock();
    var running = true;
    function frame() {
      if (!running) return;
      requestAnimationFrame(frame);
      var time = clock.getElapsedTime();
      if (intro.active && introPts) updateIntroParticles(time);
      apply(time);
      renderer.render(scene, camera);
    }
    function renderOnce() { apply(0); renderer.render(scene, camera); }

    /* ----- scroll timeline: scrolling the page moves the camera & objects ----- */
    var camTimeline = null;
    function buildTimeline() {
      if (camTimeline) {
        if (camTimeline.scrollTrigger) camTimeline.scrollTrigger.kill();
        camTimeline.kill();
      }
      var main = $('#story');
      var vh = window.innerHeight;
      var mainTop = main.getBoundingClientRect().top + window.scrollY;
      var max = Math.max(1, main.offsetHeight - vh);
      function topOf(el) { return el.getBoundingClientRect().top + window.scrollY - mainTop; }

      // Where (0 → 1 of the page scroll) each keyframe is reached
      var hero = $('#home');
      var marks = [0, clamp((hero.offsetHeight - vh) / max, 0.001, 1)];
      ['about', 'services', 'process'].forEach(function (id) {
        var el = document.getElementById(id);
        marks.push(clamp((topOf(el) + el.offsetHeight / 2 - vh / 2) / max, 0, 1));
      });
      marks.push(1);
      for (var i = 1; i < marks.length; i++) { if (marks[i] <= marks[i - 1]) marks[i] = Math.min(1, marks[i - 1] + 0.002); }
      marks[marks.length - 1] = 1;

      camTimeline = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: { trigger: main, start: 'top top', end: 'bottom bottom', scrub: 1.2, invalidateOnRefresh: true }
      });
      for (var s = 1; s < kfs.length; s++) {
        var to = Object.assign({}, kfs[s], { duration: marks[s] - marks[s - 1], immediateRender: s === 1 });
        camTimeline.fromTo(S, Object.assign({}, kfs[s - 1]), to, marks[s - 1]);
      }
      camTimeline.set({}, {}, 1); // makes the timeline exactly 1 long
    }

    /* ----- intro (particles → N → burst → site) ----- */
    var introEl = $('#intro');
    var introTl = null;
    var skipBtn = $('#skipIntro');

    function finishIntro() {
      if (!intro.active) return;
      intro.active = false;
      intro.mix = 1;
      if (introPts) { scene.remove(introPts); introPts.geometry.dispose(); introPts.material.dispose(); introPts = null; }
      introEl.classList.add('done');
      root.classList.remove('is-intro');
      window.scrollTo(0, 0);
      if (hasGSAP) {
        gsap.from('.hero-copy > *', { y: 40, opacity: 0, duration: 1, stagger: 0.14, ease: 'power3.out' });
        ScrollTrigger.refresh();
      }
    }
    function startIntro() {
      intro.active = true; intro.mix = 0; intro.camZ = 12;
      buildIntroParticles();
      window.scrollTo(0, 0);
      introTl = gsap.timeline({ onComplete: finishIntro });
      introTl
        .to(intro, { form: 1, duration: 3.4, ease: 'power2.inOut' }, 0.3)          // particles gather into the N
        .to(intro, { camZ: 8.8, duration: 6, ease: 'power1.inOut' }, 0)            // slow cinematic push-in
        .add(function () { introEl.classList.add('show-name'); }, 2.8)             // NXORA + tagline fade in
        .add(function () { introEl.classList.remove('show-name'); }, 5.3)
        .to(intro, { burst: 1, duration: 1.0, ease: 'power3.in' }, 5.4)            // N bursts apart
        .to(intro, { mix: 1, duration: 0.9, ease: 'power2.inOut' }, 5.5)           // camera hands over to scroll camera
        .to(R, { v: 1, duration: 1.7, ease: 'power3.out' }, 5.9)                   // mockups grow into view
        .add(finishIntro, 6.45);                                                    // unlock page + reveal hero text
    }
    function skipIntro() {
      if (!intro.active || !introTl) return;
      introTl.kill();
      introEl.classList.remove('show-name');
      gsap.timeline({ onComplete: finishIntro })
        .to(intro, { burst: 1, mix: 1, duration: 0.6, ease: 'power2.in' }, 0)
        .to(R, { v: 1, duration: 1.3, ease: 'power3.out' }, 0.25);
    }
    skipBtn.addEventListener('click', skipIntro);
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') skipIntro(); });

    /* ----- resize (debounced) ----- */
    var resizeTimer;
    function onResize() {
      var w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      portrait = w / h < 0.95;
      kfs = buildKeyframes();
      if (reduceMotion) { Object.assign(S, kfs[0]); renderOnce(); }
      else { buildTimeline(); ScrollTrigger.refresh(); }
    }
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, 150);
    });
    // Layout can shift once images/fonts finish loading, so re-measure then
    window.addEventListener('load', function () { if (!reduceMotion) { buildTimeline(); ScrollTrigger.refresh(); } });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (!reduceMotion) { buildTimeline(); ScrollTrigger.refresh(); } });
    }

    /* ----- go! ----- */
    if (reduceMotion) {
      // Static hero scene, no intro, no scroll-driven movement
      R.v = 1;
      root.classList.remove('is-intro');
      introEl.classList.add('done');
      renderOnce();
      return;
    }
    buildTimeline();
    if (lite) {
      // Weak device: skip the intro, keep the scroll-driven scene
      R.v = 1;
      root.classList.remove('is-intro');
      introEl.classList.add('done');
    } else {
      startIntro();
    }
    frame();
  }

  /* ---------------------------------------------------------
     START
     --------------------------------------------------------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  initUI();
  if (hasGSAP && !reduceMotion) initDomScroll(); else if (!reduceMotion) initPlainReveal();
  if (reduceMotion) $$('.step').forEach(function (s) { s.classList.add('on'); });

  var can3D = hasTHREE && webglAvailable() && (hasGSAP || reduceMotion);
  if (can3D) {
    try {
      init3D();
    } catch (err) {
      console.error('NXORA: 3D scene failed, showing the simple version.', err);
      root.classList.add('no-3d');
      root.classList.remove('is-intro');
    }
  } else {
    // No WebGL or libraries blocked: show the page without the 3D scene
    root.classList.add('no-3d');
    root.classList.remove('is-intro');
  }
})();
