# Turon AI Test System

Bu loyiha **TURON O'QUV MARKAZI** uchun maxsus yaratilgan AI asosidagi test tizimi.

## Imkoniyatlar
- **Talabalar uchun**: Testlar topshirish, real vaqtda natijalarni ko'rish.
- **Adminlar uchun**:
  - Dashboard orqali statistikalarni kuzatish.
  - **AI Test Yaratish**: PDF yoki Word fayllarni yuklab, avtomatik testlar yaratish (DeepSeek AI orqali).
  - **Live Monitoring**: Talabalarning test topshirish jarayonini real vaqtda kuzatish.
  - **Socket.io Integration**: Real vaqt rejimida aloqa.

## Texnologiyalar
- **Frontend**: HTML5, Vanilla CSS, Bootstrap 5, Socket.io-client.
- **Backend**: Node.js, Express.
- **Ma'lumotlar bazasi**: MongoDB Atlas.
- **AI**: DeepSeek API.

## O'rnatish va Ishga Tushirish

1. Terminalni oching va loyiha papkasiga o'ting:
   ```bash
   cd C:\Users\User\.gemini\antigravity\scratch\turon-ai-system
   ```

2. Kerakli kutubxonalarni o'rnating:
   ```bash
   npm install
   ```

3. Loyihani ishga tushiring:
   ```bash
   npm start
   ```

4. Brauzerda oching: `http://localhost:5000`

## Vercel Deployment haqida MUHIM ESLATMA
Ushbu loyiha Vercel-ga moslab sozlangan (`vercel.json`), lekin:
- **Socket.io** (Live Monitoring) Vercel-ning Serverless funksiyalarida to'liq ishlamasligi mumkin.
- To'liq funksionallik (Sockets bilan) uchun **Render.com** yoki **Railway.app** kabi platformalar tavsiya etiladi.

## Muallif
© 2024 Turon O'quv Markazi
