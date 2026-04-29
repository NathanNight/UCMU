# U.C.M.U. Chat v99 modular auth

Чистая модульная версия.

## Файлы

- `index.html` — точка входа.
- `css/splash.css` — отдельная стартовая заставка/регистрация/вход, вынесена из `firebase-main-v63.html`.
- `js/auth.js` — логика заставки, переключение вход/регистрация, проверка пароля.
- `js/app.js`, `js/actions.js`, `js/render.js` — чат.

## Тестовый пароль

```txt
umbrella
```

Регистрация сейчас локальная: сохраняется в `localStorage` браузера. Это не Firebase-авторизация, а безопасный тестовый слой, чтобы не ломать чат.

## Заливка

В корень репозитория должны попасть:

```txt
index.html
assets/
css/
js/
README.md
```


v100: fixed dark auth inputs, password eye toggle, crossfade into app, remembered login screen restored for password login.
