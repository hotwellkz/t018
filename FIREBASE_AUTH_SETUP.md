# Настройка Firebase Authentication

## Проблема: auth/invalid-credential

Если вы получаете ошибку `auth/invalid-credential` при попытке входа, выполните следующие шаги:

### 1. Включите Email/Password провайдер в Firebase Console

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект `bibi-b7ce9`
3. Перейдите в **Authentication** → **Sign-in method**
4. Найдите **Email/Password** в списке провайдеров
5. Нажмите на него и включите переключатель **Enable**
6. Нажмите **Save**

### 2. Проверьте пользователя

Запустите скрипт для проверки:
```bash
cd backend
npm run check-firebase-user
```

### 3. Создайте/обновите пользователя

Если пользователь не существует или нужно обновить пароль:
```bash
cd backend
npm run create-firebase-user
```

### 4. Проверьте конфигурацию Firebase на фронтенде

Убедитесь, что в `.env` файле фронтенда указаны правильные значения:
```
VITE_FIREBASE_API_KEY=AIzaSyD7tl5XU8vgsN5z6pNiboLlGjEljBDGVLU
VITE_FIREBASE_AUTH_DOMAIN=bibi-b7ce9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bibi-b7ce9
```

### 5. Данные для входа

- **Email:** `hotwell.kz@gmail.com`
- **Пароль:** `fghRTht3@`

### Важно

После включения Email/Password провайдера в Firebase Console может потребоваться несколько минут для применения изменений.

