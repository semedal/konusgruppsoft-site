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

  // Главная: «считывание» меток на вагоне. Данные демонстрационные.
  var TAGS = {
    kuzov:  { epc: '4C41 5250 4954 0001 00A7 3F2C 91D4 5B08', part: 'Вагон, метка на кузове', num: 'комплект по схеме', made: 'схема маркировки базовая', st: 'Комплект совпадает', op: 'Контрольное считывание' },
    os:     { epc: '4C41 5250 4954 0002 11C4 7A90 2E6B 03F1', part: 'Ось колёсной пары', num: '0029-41873', made: 'завод 5, 2024 год', st: 'Записана, проверена', op: 'Запись при маркировке' },
    vr:     { epc: '4C41 5250 4954 0003 5D0E 88B2 C417 9A26', part: 'Воздухораспределитель', num: '16635', made: '06.2026', st: 'Записана, проверена', op: 'Считывание после ремонта' },
    rama:   { epc: '4C41 5250 4954 0004 E2F9 104D 6B73 C85A', part: 'Боковая рама', num: '14-52907', made: 'завод 14, 2023 год', st: 'Записана, проверена', op: 'Считывание при ремонте' },
    koleso: { epc: '4C41 5250 4954 0005 7B36 D1A8 0F92 4E6C', part: 'Колесо цельнокатаное', num: '29-118340', made: 'завод 29, 2025 год', st: 'Записана, проверена', op: 'Считывание на складе' },
    scep:   { epc: '4C41 5250 4954 0006 A90C 35E7 D248 1B7F', part: 'Корпус автосцепки', num: '12-06644', made: 'завод 12, 2022 год', st: 'Записана, проверена', op: 'Осмотр вагона' }
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
        reader.querySelector('.rd-epc').textContent = d.epc.slice(0, 19) + '\n' + d.epc.slice(20);
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
