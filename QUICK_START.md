# Швидкий старт - Twilio Conversations

## Проблема, яку ми виправили

**Помилка:** `Connection state: denied` та `Cannot read properties of undefined`

**Причини:**
1. Неправильний імпорт в backend (`.ts` замість `.js`)
2. Client не чекав на підключення перед використанням
3. Відсутність автоматичного створення conversation

## Що було виправлено

✅ Виправлено імпорт в `twilio.routes.ts` (`.ts` → `.js`)
✅ Додано endpoint для створення conversation
✅ Додано endpoint для додавання participant
✅ Покращено обробку помилок підключення
✅ Додано очікування підключення перед використанням
✅ Frontend тепер автоматично створює conversation та додає participant

## Покрокова інструкція

### Крок 1: Перевірте Twilio Credentials

У файлі `.env` проєкту `inmate-photos-chatbot` мають бути:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret
TWILIO_CONVERSATIONS_SERVICE_SID=ISxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Важливо:** 
- API Key та API Secret повинні бути створені для того ж Account SID
- Conversations Service SID повинен бути правильним

### Крок 2: Запустіть Backend

```bash
cd /Users/surik3415/inmate-photos-chatbot
npm run dev
```

Перевірте, що backend запустився на `http://localhost:3001`

### Крок 3: Тестуйте Backend Endpoints

**Тест 1: Генерація токену**
```bash
curl "http://localhost:3001/api/twilio/token?identity=test_user"
```

Якщо бачите помилку про credentials - перевірте `.env` файл.

**Тест 2: Створення Conversation**
```bash
curl -X POST http://localhost:3001/api/twilio/conversation \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_user"}'
```

Має повернути `conversationSid`.

### Крок 4: Запустіть Frontend

```bash
cd /Users/surik3415/twilio-chat-client
npm run dev
```

Відкрийте `http://localhost:5173`

### Крок 5: Підключіться

1. Введіть User Identity (наприклад, `test_user`)
2. Переконайтеся, що "Use Backend API" встановлений
3. Натисніть "Connect"

Frontend автоматично:
- Отримає токен з backend
- Створить conversation (якщо не існує)
- Додасть вас як participant
- Підключиться до conversation

### Крок 6: Відправте повідомлення

Після підключення введіть повідомлення та натисніть "Send".

## Діагностика

### Якщо бачите "Connection denied":

1. Перевірте токен:
   ```bash
   curl "http://localhost:3001/api/twilio/token?identity=test_user"
   ```
   Токен має бути довгим JWT рядком.

2. Перевірте Twilio credentials в `.env`

3. Переконайтеся, що API Key створений для правильного Account SID

4. Перевірте Conversations Service SID

### Якщо бачите "Cannot read properties of undefined":

1. Переконайтеся, що backend запущений
2. Перевірте консоль браузера на детальні помилки
3. Переконайтеся, що conversation створена

### Перевірка логів

Backend має виводити:
```
[Token Generation] Generated token for identity: test_user
[Conversation] Created/retrieved conversation: CH...
[Participant] Added participant: MB...
```

Frontend має виводити:
```
[Twilio] Current connection state: connecting
[Twilio] Connection state changed: connected
[Twilio] Connected to conversation: CH...
```

## Готово! 🎉

Якщо все працює, ви маєте бачити:
- Статус "Connected" (зелена точка)
- Можливість відправляти повідомлення
- Повідомлення з'являються в чаті

