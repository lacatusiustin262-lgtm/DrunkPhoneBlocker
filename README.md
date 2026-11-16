# Drunk Phone Blocker

Aplicație mobile (Expo / React Native) care îți blochează telefonul pentru o perioadă alégă de timp, pentru a nu folosi dispozitivul în timp ce bățîi. Permite doar:
- **Apeluri de urgență** catre contacte de încredere (selectate înainte de blocare)
- **Note text** (salvate pentru "dimineața după")
- **Foto cu camera** (vizualizabile doar după expirare / deblocare)
- **Deblocare anticipată** printr-un cod de 4 cifre comunicat unei persoane de încredere

## Stack

- Expo SDK 58, React Native 0.88.1, TypeScript
- Expo Router (file-based navigation, `src/app/`)
- `expo-sqlite` (baza de date locală: sesiuni, contacte, note, poze)
- `expo-camera` (fotografii)
- `expo-notifications` (notificare la deblocare)
- `expo-keep-awake` (ecranul aprins în timpul blocării)
- `expo-screen-capture`, `expo-system-ui`, `expo-status-bar`
- `@expo/vector-icons` (Feather)

## Comenzi

```bash
# Instalează dependențele (SDK-compatible)
npm install

# Rulează serverul de dezvoltare (Metro)
npm start                 # sau: npx expo start

# Rulează pe Android (necesită Android SDK + telefon cu depurare USB activată)
npm run android           # sau: npx expo run:android

# Rulează pe iOS (doar macOS)
npm run ios               # sau: npx expo run:ios

# Web (poate arăta ecran alb în browser — vede mai jos)
npm run web               # sau: npx expo start --web

# Lint + typecheck (rulează înainte de a declara terminat)
npm run lint              # npx expo lint
npx tsc --noEmit
```

## Instalare pe telefon (Android)

1. Activează **Optiuni pentru dezvoltatori** pe telefon: *Setări → Despre telefon → apasă 7 ori pe "Număr build"*.
2. În Optiuni pentru dezvoltatori, activează **Depurare USB**.
3. Conectează telefonul prin USB și authorizează computerul când apare popup-ul pe telefon.
4. Deschide un terminal în folderul proiectului și rulează:
   ```bash
   npx expo start --port 8083
   ```
5. În alt terminal:
   ```bash
   adb reverse tcp:8083 tcp:8083
   npx expo run:android
   ```
   Sau, dacă APK-ul e deja construit:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
6. Pentru a evita adormirea ecranului în timpul testării:
   ```bash
   adb shell svc power stayon true
   adb shell settings put system screen_off_timeout 2147483647
   ```

## Structura proiectului

```
src/app/
  index.tsx       — ecran de pornire / redirecționare (setup sau lock)
  _layout.tsx     — navigatoare Stack (fără header)
  setup.tsx       — selectează durata, contacte de urgență, cod de 4 cifre
  lock.tsx        — ecran de blocare: timer, apeluri urgență, notă, camera
  unlock.tsx      — deblocare anticipată cu cod de 4 cifre
  morning.tsx     — galeria "dimineața după" (poze + note)
src/lib/db.ts     — SQLite: sesiuni, contacte, note, poze
src/lib/notifications.ts — expo-notifications (programare notificare)
src/theme.ts      — culori, durate, formatTimeLeft
src/components/PinInput.tsx — input de 4 cifre pentru codul de deblocare
```

## Limită importantă: "blocarea reală" a telefonului

Expo / React Native **nu poate bloca efectiv dispozitivul** (nu poate ascunde butonul Home, nu poate opri alte aplicații, nu poate împiedica deblocarea cu fingerprint / fata). Este o limită de sistem Android/iOS — o aplicație obișnuită nu are permisiunea de "kiosk mode" / Device Owner decât dacă este instalată ca soluție MDM (enterprise) cu acces special de administrator.

Ce face aplicația:
- Afișează o interfață de blocare cu countdown (telefonul rămâne pe ecranul aplicației).
- Permite apeluri de urgență, note și poze în timpul blocării.
- Trimitere notificare la expirare.
- Cod de 4 cifre pentru deblocare anticipată (comunicat unei persoane de încredere).

Pentru un bloc real al telefonului e necesară o soluție MDM/kiosk, depășind Expo pur.

## Depurare USB pe Samsung

În *Optiuni pentru dezvoltatori* caută categoria **Depurare** (nu Desen sau Intrare). Activează:
- Depurare USB
- (opțional) Instalare prin USB / Depurare Wireless

Când conectezi telefonul prin USB, pe ecranul telefonului va apărea un popup "Permite depurare USB?" — bifează "Întotdeauna de la acest computer" și apasă **OK**.

## E2E — test complet pe telefon

1. Deschide aplicația → e redirecționat la **Setup**.
2. Alege durata (ex. 2 ore), adaugă cel puțin un contact de urgență, setează un cod de 4 cifre.
3. Apasă **Blochează telefonul** → ajungi pe **Lock** (timer activează).
4. Apasă un contact de urgență → se deschide apelul telefonic.
5. Scrie o notă și apasă **Salvează nota**.
6. Apasă **Face o poze** → se deschide camera → capturează o fotografie.
7. Apasă pictograma cu ciorap (lock) din antet → **Unlock** → introduce codul de 4 cifre → **Morning**.
8. Pe **Morning** vezi durata blocării, pozele și notele salvate; poți porni o nouă blocare.

## Note

- Proiectul folosește **Continuous Native Generation** (CNG): folderele `ios/` și `android/` sunt generate, nu se editează manual. Configurația nativă e în `app.json` și pluginurile Expo.
- `expo-dev-client` și `expo-av` au fost eliminate (incompatibilitate cu RN 0.88.1 / JSI).
- Pentru lansare pe App Store / Google Play folosește EAS: `npx eas-cli build`, `npx eas-cli submit`.
