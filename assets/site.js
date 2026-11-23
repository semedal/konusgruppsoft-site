// konusgruppsoft.ru — переключатель темы и выдача протоколов по коду.
(function () {
  var root = document.documentElement;

  function current() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function label(btn) {
    var span = btn.querySelector('span');
    if (span) span.textContent = current() === 'light' ? 'Тёмная' : 'Светлая';
  }
  document.querySelectorAll('.theme').forEach(function (btn) {
    label(btn);
    btn.addEventListener('click', function () {
      var next = current() === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      label(btn);
    });
  });

  // Протоколы: файл отдаёт сервер только по верному коду. Адрес сервера — в data-api у <body>.
  var api = document.body.dataset.api || '';
  document.querySelectorAll('.proto form').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var msg = form.querySelector('.msg');
      var code = form.querySelector('input').value.trim();
      if (!code) { msg.textContent = 'Введите код доступа.'; return; }
      if (!api) {
        msg.innerHTML = 'Скачивание по коду подключается. Запросить протокол: <a href="mailto:info@konusgruppsoft.ru">info@konusgruppsoft.ru</a>.';
        return;
      }
      msg.textContent = 'Проверяем код…';
      fetch(api + '/check?code=' + encodeURIComponent(code))
        .then(function (r) {
          if (r.ok) {
            msg.textContent = 'Код принят, загрузка началась.';
            location.href = api + '/file/' + encodeURIComponent(form.dataset.doc) + '?code=' + encodeURIComponent(code);
          } else {
            msg.textContent = 'Код не подошёл. Проверьте и введите ещё раз.';
          }
        })
        .catch(function () { msg.textContent = 'Сервер недоступен, попробуйте позже.'; });
    });
  });

  // Главная: «считывание» меток на вагоне. Данные — из журнала ЛАРПИТ: полувагон, промаркированный 31.08.2026
  // (тип детали, номер, время записи метки). В идентификаторе метки показана первая половина, вторая скрыта.
  var TAGS = {
    kuzov:  { epc: '1B56 097A 49AF 4B72', part: 'Вагон, метка на кузове', num: 'деталей 34, с метками 34', made: '31.08.2026, 12:58', st: 'Вагон готов', op: 'Запись метки вагона' },
    os:     { epc: 'D78A 9567 8566 450F', part: 'Ось колёсной пары', num: '000515070/3', made: '31.08.2026, 12:51', st: 'Записана', op: 'Запись метки' },
    vr:     { epc: '15D8 62CE 15AB 4150', part: 'Камера воздухораспределителя', num: '295М.001', made: '31.08.2026, 13:06', st: 'Записана', op: 'Запись метки' },
    rama:   { epc: 'B563 359A 3E45 4B9E', part: 'Рама боковая', num: '41420', made: '31.08.2026, 12:43', st: 'Записана', op: 'Запись метки' },
    koleso: { epc: '6731 D16B 74A2 4205', part: 'Колесо цельнокатаное', num: '186235', made: '31.08.2026, 12:46', st: 'Записана', op: 'Запись метки' },
    scep:   { epc: 'DB99 7E0C F166 4ED5', part: 'Корпус автосцепки', num: '21695', made: '31.08.2026, 12:56', st: 'Записана', op: 'Запись метки' }
  };
  var reader = document.querySelector('.reader');
  if (reader) {
    var pts = document.querySelectorAll('.tagpt');
    var timer;
    var read = function (btn) {
      var d = TAGS[btn.dataset.k];
      pts.forEach(function (x) { x.classList.toggle('on', x === btn); });
      reader.classList.remove('is-ok'); reader.classList.add('is-busy');
      var g = document.querySelector('.gun'); if (g) g.classList.add('fire');
      reader.querySelector('.rd-state').textContent = 'Считывание…';
      clearTimeout(timer);
      timer = setTimeout(function () {
        reader.querySelector('.rd-epc').textContent = d.epc + '\n•••• •••• •••• ••••';
        ['part', 'num', 'made', 'st', 'op'].forEach(function (f) {
          reader.querySelector('[data-f="' + f + '"]').textContent = d[f];
        });
        reader.querySelector('.rd-state').textContent = 'Считано';
        reader.classList.remove('is-busy'); reader.classList.add('is-ok');
        if (g) setTimeout(function () { g.classList.remove('fire'); }, 500);
      }, 380);
    };
    pts.forEach(function (btn) { btn.addEventListener('click', function () { read(btn); }); });

    // Считыватель вместо курсора: наводим на метку — она считывается.
    var wagon = document.querySelector('.wagon');
    var gun = document.querySelector('.gun');
    if (wagon && gun && window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      wagon.addEventListener('pointermove', function (ev) {
        var r = wagon.getBoundingClientRect();
        var k = gun.getBoundingClientRect().width / 154; // антенна считывателя — под указателем
        gun.style.transform = 'translate(' + (ev.clientX - r.left - 6 * k) + 'px,' + (ev.clientY - r.top - 71 * k) + 'px)';
        wagon.classList.add('aim');
      });
      wagon.addEventListener('pointerleave', function () { wagon.classList.remove('aim'); });
      pts.forEach(function (btn) {
        btn.addEventListener('pointerenter', function () {
          if (!btn.classList.contains('on')) read(btn);
        });
      });
    }
    setTimeout(function () { read(pts[3]); }, 600);
  }

  // Окна по кнопке (запись в реестре)
  document.querySelectorAll('[data-dialog]').forEach(function (btn) {
    var dlg = document.getElementById(btn.dataset.dialog);
    if (!dlg || !dlg.showModal) return;
    btn.addEventListener('click', function () { dlg.showModal(); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
  });

  // Просмотр фото
  var box = document.querySelector('.lightbox');
  if (box && box.showModal) {
    document.querySelectorAll('a.shot').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        box.querySelector('img').src = a.getAttribute('href');
        box.querySelector('img').alt = a.dataset.cap || '';
        box.querySelector('p').textContent = a.dataset.cap || '';
        box.showModal();
      });
    });
    box.addEventListener('click', function (ev) { if (ev.target === box) box.close(); });
  }
})();
