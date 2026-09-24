# konusgruppsoft.ru

Одностраничная заглушка сайта АО «КонусГрупп Софт» (АО «КГ Софт»).
Статика без сборки: `index.html`, `styles.css`, `main.js`, three.js лежит в `vendor/`.

## Локально

ES-модули не работают с `file://`, нужен любой http-сервер:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Деплой в Timeweb Cloud (App Platform)

- Тип приложения: **Статический сайт (HTML/CSS/JS)**.
- Репозиторий: `semedal/konusgruppsoft-site`, ветка `main`.
- Команда сборки: пустая.
- Директория сборки: корень репозитория (`.`).
- После деплоя привязать домен `konusgruppsoft.ru` во вкладке «Настройки» приложения.

## Что править

- Почта и адрес: `index.html`, блок `<address class="label">`.
- Цвета: переменные в начале `styles.css`.
- Обновить three.js: `scripts/vendor-three.sh 0.186.0`.
