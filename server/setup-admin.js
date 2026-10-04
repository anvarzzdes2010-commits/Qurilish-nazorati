# Qurilish Nazorati

Qurilish boshqaruvi tizimi. React + Express + SQLite.

## Tez boshlash

```bash
npm install
npm run dev
```

## Rahbar yaratish

```bash
ADMIN_USERNAME=rahbar ADMIN_PASSWORD='Rahbar123!' node server/setup-admin.js
```

## Dasturda kirish

- Login: `rahbar`
- Parol: `Rahbar123!`

## Rollar

- RAHBAR
- PRARAB
- PTO

## Android install

```bash
npm install
npm run build
npx cap init uz.qurilish.nazorati "Qurilish Nazorati"
npx cap add android
npx cap sync android
npx cap open android
```

Pastdagi Android Studio orqali APK yaratish mumkin.

## API misollar

- `/api/auth/login`
- `/api/projects`
- `/api/estimates/upload/:projectId`
- `/api/reports`
- `/api/notifications`
- `/api/analytics`

## Muqaddima

Bu tizim real backend, database, auth, roles, reports, notifications va estimate parsing uchun ishlab chiqilgan. 

## Xavfsizlik

- parollar bcrypt bilan saxlanadi
- sessions secure cookie orqali saqlanadi
- backendda ruxsatlar tekshiriladi
- fayl turlari cheklangan

## Nazorat ro'yxati

- auth
- RBAC
- object creation
- estimate upload
- report workflow
- notifications
- analytics

