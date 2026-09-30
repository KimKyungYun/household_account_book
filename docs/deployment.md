# 배포

이 앱을 실제로 인터넷에 올려 두 사람이 쓰는 방법. 구조를 먼저 적고, 두 가지 경로를
순서대로 적는다. 서버와 DB 구조 자체는 [architecture.md](./architecture.md) 를 본다.

- 확인 기준: Next 16.3.2 / Prisma 7.9.1 / Node 24 / Yarn 4.18
- 이 문서의 절차는 실제로 돌려 보고 적었다(아래 **검증한 것**)

---

## 1. 무엇을 올려야 하나

이 앱은 **한 덩이**다. 프론트와 API 가 같은 Next 프로세스 안에 있으므로 올릴 것은 둘뿐이다.

```
[ Next 앱 ]  ──  [ PostgreSQL ]
  화면 + API          데이터
```

앱이 살아 있으려면 다음이 갖춰져야 한다.

| | 왜 |
| --- | --- |
| Node 20.9 이상 | `next` 의 `engines` 가 `>=20.9.0`. 개발은 24.3 에서 했다 |
| PostgreSQL 14 이상 | `pg_trgm` 확장을 쓴다(검색 인덱스) |
| 환경변수 6개 | 아래 3번 |
| **마이그레이션 적용** | 코드만 올리면 테이블이 없다 |
| **`prisma generate` 실행** | 아래 2번 — 가장 자주 막히는 자리 |

별도로 돌려야 하는 워커·크론·큐·캐시는 없다. 반복 거래 생성은 앱에 들어올 때
`(main)/layout.tsx` 가 처리하므로 스케줄러를 붙이지 않아도 된다.

---

## 2. 먼저 알아야 할 함정

### `prisma generate` 는 설치 뒤에 저절로 돈다 — 건드리지 않는다

Prisma 클라이언트가 `node_modules` 가 아니라 **`src/generated/prisma`** 로 나오고,
그 경로는 `.gitignore` 에 있다. 코드가 `@/generated/prisma/client` 를 import 하므로
새로 clone 한 환경에서 생성을 건너뛰면 빌드가 이렇게 깨진다.

```
Error: Module not found: Can't resolve '@/generated/prisma/client'
```

그래서 `package.json` 에 이 줄을 두었다. `yarn install` 뒤에 자동으로 돌므로
배포 플랫폼의 빌드 명령은 기본값(`next build`)으로 두면 된다.

```json
"postinstall": "prisma generate"
```

**이 줄을 지우면 배포가 깨진다.** 로컬에는 이미 생성된 파일이 남아 있어 눈치채지 못하고,
새 환경에서만 터진다.

### `AUTH_URL` 을 실제 주소로 바꾼다

`.env.example` 에는 `http://localhost:4000` 이 들어 있다. 이걸 그대로 두면 로그인 후
localhost 로 되돌아가 인증이 끝나지 않는다. 배포 도메인을 그대로 적는다.

```
AUTH_URL="https://가계부.example.com"
```

### `AUTH_ALLOWED_EMAILS` 를 반드시 채운다

비어 있으면 아무도 가입할 수 없다. 반대로 값이 잘못되면 모르는 사람이 가입한다.
이 앱에는 다른 가입 제한이 없으므로 **이 변수 하나가 유일한 문지기**다.

```
AUTH_ALLOWED_EMAILS="husband@example.com,wife@example.com"
```

### 시드 변수는 올리지 않는다

`SEED_*` 는 로컬 개발용이다. 프로덕션에 두면 `yarn db:seed` 를 잘못 돌렸을 때
알려진 비밀번호의 계정이 생긴다.

---

## 3. 환경변수

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | 앱이 쓰는 접속 문자열. 서버리스면 **pooled** 엔드포인트 |
| `DIRECT_DATABASE_URL` | 마이그레이션 시 | 마이그레이션 전용 직결 주소. 없으면 `DATABASE_URL` 을 쓴다 |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32`. 바꾸면 모든 세션이 끊긴다 |
| `AUTH_URL` | ✅ | 배포 도메인 (`https://` 포함) |
| `AUTH_ALLOWED_EMAILS` | ✅ | 가입을 허용할 이메일. 콤마로 구분 |
| `NEXT_PUBLIC_APP_NAME` | | 화면에 보이는 앱 이름 |
| `AUTH_TRUST_HOST` | | 코드에 `trustHost: true` 가 있어 없어도 된다 |
| `DEV_ALLOWED_ORIGINS` | | 개발 전용. 프로덕션에서는 쓰이지 않는다 |

`prisma.config.ts` 가 마이그레이션에 `DIRECT_DATABASE_URL ?? DATABASE_URL` 을 쓴다.
로컬에서는 둘이 같은 값이다.

---

## 4. 경로 A — Vercel + Neon (권장)

2인용 가계부에는 이쪽이 맞다. 서버를 관리할 일이 없고 무료 구간으로 충분하다.

### 4-1. DB 만들기 (Neon)

1. [neon.tech](https://neon.tech) 에서 프로젝트를 만든다. 리전은 **가까운 곳**으로 —
   앱과 DB 가 멀면 요청마다 왕복 지연이 그대로 쌓인다.
2. 연결 문자열 두 개를 받아 둔다.
   - **Pooled** (`-pooler` 가 붙은 것) → `DATABASE_URL`
   - **Direct** → `DIRECT_DATABASE_URL`

서버리스는 요청마다 커넥션을 새로 열기 때문에 앱은 반드시 pooled 를 써야 한다.
마이그레이션은 세션 수준 잠금을 잡으므로 direct 여야 한다.

### 4-2. 첫 마이그레이션

로컬에서 프로덕션 DB 를 향해 한 번 적용한다.

```bash
DIRECT_DATABASE_URL="<neon direct url>" yarn prisma migrate deploy
```

`migrate dev` 가 아니라 **`migrate deploy`** 다. `dev` 는 스키마 변화를 감지해
새 마이그레이션을 만들려 하고 대화형 프롬프트에서 멈춘다.

### 4-3. Vercel 연결

1. GitHub 저장소를 Vercel 에 연결한다. 프레임워크는 자동으로 Next 로 잡힌다.
2. 빌드 명령은 **기본값 그대로** 둔다. `postinstall` 이 Prisma 클라이언트를 만든다.
3. 환경변수를 넣는다(3번 표). `AUTH_URL` 은 배포 후 받은 도메인으로 다시 맞춘다.
4. 배포.

> **`output: 'standalone'` 은 Vercel 에서 반드시 꺼야 한다.** 그대로 두면 빌드가
> `ENOENT: .next/next-server.js.nft.json` 으로 죽는다 —
> Vercel 빌더가 설정에서 `standalone` 을 떼어내는데, Turbopack 은 그 옵션이 있을 때만
> 그 파일을 쓰고, Vercel 의 `onBuildComplete` 는 그 파일을 읽는다
> (Next 16.3 의 알려진 버그, vercel/next.js#96646).
>
> `next.config.ts` 가 `VERCEL` 환경변수로 이미 분기해 둔다 —
> Vercel 에서는 빠지고, Docker/VPS 빌드에서는 그대로 만들어진다. 손댈 것은 없다.

### 4-4. 첫 사용자 만들기

시드를 돌리지 않는다. 화면에서 만든다.

1. `https://<도메인>/signup` 에서 첫 사람이 가입 → 가구가 만들어진다
2. 설정 화면에서 **초대 코드**를 확인해 배우자에게 전달
3. 배우자가 가입 후 초대 코드로 합류

두 이메일 모두 `AUTH_ALLOWED_EMAILS` 에 들어 있어야 한다.

---

## 5. 경로 B — 직접 서버에 올리기 (Docker / VPS)

집 서버나 VPS 에 두고 싶을 때. `next.config.ts` 가 Vercel 이 아닌 빌드에서
`output: 'standalone'` 을 켜므로 준비는 돼 있다.

### 5-1. standalone 이 무엇을 만드나

`yarn build` 가 `.next/standalone/` 에 **실행에 필요한 것만** 추린 폴더를 만든다.
`node_modules` 까지 들어 있어 그대로 옮기면 돈다(이 프로젝트 기준 55MB).

**단, 정적 자산은 들어 있지 않다.** 이것이 standalone 에서 가장 자주 겪는 함정이다 —
서버는 뜨는데 CSS 와 폰트가 404 가 난다. 두 폴더를 손으로 넣어야 한다.

```bash
cp -r .next/static .next/standalone/.next/static   # 2.1MB
cp -r public       .next/standalone/public          # 3.8MB
```

그 뒤 이렇게 실행한다.

```bash
cd .next/standalone
PORT=4000 HOSTNAME=0.0.0.0 node server.js
```

`yarn start` 가 아니다. standalone 은 자기 `server.js` 로 뜬다.

### 5-2. Dockerfile

저장소에 Dockerfile 이 없으므로 아래를 루트에 만든다. 빌드 단계와 실행 단계를 나눠
최종 이미지에 소스와 빌드 도구가 남지 않게 한다.

```dockerfile
# ── 빌드 ──────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable

COPY . .
# 이 줄이 없으면 @/generated/prisma 를 찾지 못해 빌드가 깨진다
RUN yarn prisma generate
RUN yarn build

# ── 실행 ──────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# standalone 이 담지 않는 두 가지를 넣는다
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# 컨테이너 안에서 마이그레이션을 돌리려면 함께 넣는다
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 4000
ENV PORT=4000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
```

### 5-3. compose 로 앱과 DB 함께 띄우기

저장소의 `docker-compose.yml` 은 **로컬 개발용 Postgres 하나**뿐이다. 배포용으로는
앱을 더한 별도 파일을 쓴다.

```yaml
# docker-compose.prod.yml
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: hab
      POSTGRES_PASSWORD: ${DB_PASSWORD}   # 로컬의 'hab' 을 그대로 쓰지 않는다
      POSTGRES_DB: household_account_book
      TZ: Asia/Seoul
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U hab -d household_account_book']
      interval: 5s
      timeout: 3s
      retries: 10

  app:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://hab:${DB_PASSWORD}@db:5432/household_account_book?schema=public
      DIRECT_DATABASE_URL: postgresql://hab:${DB_PASSWORD}@db:5432/household_account_book?schema=public
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_URL: ${AUTH_URL}
      AUTH_ALLOWED_EMAILS: ${AUTH_ALLOWED_EMAILS}
    ports:
      - '4000:4000'

volumes:
  pgdata:
```

호스트 이름이 `localhost` 가 아니라 **`db`** 다. 컨테이너끼리는 서비스 이름으로 찾는다.

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app yarn prisma migrate deploy
```

### 5-4. HTTPS

Auth.js 는 `AUTH_URL` 의 프로토콜을 보고 쿠키에 `Secure` 를 붙일지 정한다.
`AUTH_URL` 을 `https://` 로 적어 놓고 실제로는 HTTP 로 서비스하면, 브라우저가 그 쿠키를
저장하지 않아 **로그인이 끝나자마자 풀린다.** 둘을 맞추거나 — 그냥 HTTPS 를 붙인다.
Caddy 나 nginx 를 앞에 두고 인증서를 받는다. Caddy 가 가장 짧다.

```
가계부.example.com {
    reverse_proxy localhost:4000
}
```

---

## 6. 스키마를 바꿨을 때

배포된 뒤 모델을 고치면 순서가 중요하다.

```bash
# 1. 로컬에서 마이그레이션을 만든다
yarn prisma migrate dev --name <이름>

# 2. 제약·인덱스를 손으로 더해야 하면 생성된 migration.sql 을 연다
#    (CHECK 제약과 부분 유니크 인덱스는 Prisma 가 만들어 주지 않는다)

# 3. 로컬에서 확인한 뒤 커밋

# 4. 프로덕션에 적용
DIRECT_DATABASE_URL="<direct url>" yarn prisma migrate deploy
```

**컬럼을 지우거나 이름을 바꾸는 마이그레이션은 앱 배포보다 먼저 돌리지 않는다.**
옛 코드가 아직 그 컬럼을 읽고 있으면 그 사이 요청이 모두 깨진다. 지우는 변경은
①새 코드 배포 → ②마이그레이션 순서로 한다.

> **실패는 롤백되지 않을 수 있다.** 이 프로젝트에서 실제로 겪었다 — enum 값을 빼는
> 마이그레이션이 중간에 멈췄는데 앞선 `DROP TABLE` 은 이미 적용된 상태였다.
> 마이그레이션이 실패하면 DB 를 먼저 확인하고, 남은 단계만 손으로 마무리한 뒤
> `_prisma_migrations` 의 해당 행을 맞춘다. 되돌리기를 기대하지 않는다.

---

## 7. 배포 후 확인

```bash
curl -I https://<도메인>/login                       # 200
curl -I https://<도메인>/icon.svg                    # 200 (정적 자산이 붙었나)
curl -o /dev/null -w '%{http_code}\n' \
     https://<도메인>/api/me                          # 401 (미인증이면 정상)
```

화면에서는 이렇게 본다.

1. 로그인 → 대시보드가 뜬다
2. 거래를 하나 등록 → 합계가 바뀐다
3. 반복 거래를 하나 등록 → 이번 달 회차가 바로 거래로 들어온다
4. 리포트에서 엑셀을 내려받아 **한글 파일명**으로 저장되는지 본다
5. 라이트·다크를 바꿔 본다

4번을 꼭 본다. 엑셀은 `exceljs` 가 `serverExternalPackages` 로 빠져 있어, 번들 설정이
어긋나면 이 기능만 조용히 깨진다.

---

## 8. 운영

### 백업

가계부는 잃으면 복구할 수 없는 데이터다. **Neon 은 자동 백업(PITR)이 있고**, 직접
운영한다면 스스로 걸어야 한다.

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U hab household_account_book | gzip > hab-$(date +%F).sql.gz
```

### 비밀 관리

- `AUTH_SECRET` 을 바꾸면 두 사람 모두 다시 로그인해야 한다
- `.env` 는 `.gitignore` 에 있다. 커밋되지 않았는지 가끔 확인한다
  ```bash
  git ls-files | grep -x '.env' || echo '추적되지 않음'
  ```

### 로그

별도 수집기를 붙이지 않았다. `src/lib/logger.ts` 가 `console` 로 내보내므로
플랫폼 로그(Vercel Logs, `docker compose logs -f app`)에서 본다.

---

## 9. 검증한 것

이 문서의 5-1 절차를 실제로 돌려 확인했다.

| | 결과 |
| --- | --- |
| `yarn build` | 통과, `.next/standalone/` 생성 (55MB) |
| 정적 자산 복사 후 `node server.js` | `Ready`, 포트 4100 |
| `GET /login` | 200 |
| `GET /icon.svg` | 200 |
| `GET /fonts/Pretendard/Pretendard-Bold.woff2` | 200 |
| `GET /api/me` (미인증) | 401 |
| `src/generated` 를 지운 채 빌드 | `Module not found` 로 실패 — 위 함정이 실재함을 확인 |
| 같은 상태에서 `yarn install` 후 빌드 | 성공 — `postinstall` 이 클라이언트를 만든다 |

정적 자산을 복사하지 않으면 화면은 뜨지만 스타일과 폰트가 404 가 된다.

아직 실제 클라우드에 올려 보지는 않았다. 4번(Vercel + Neon)과 5-2·5-3(Dockerfile,
compose)은 이 프로젝트의 설정에 맞춰 쓴 것이고 그 자체를 배포해 검증하지는 않았다.
