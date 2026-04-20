# team-up

## Backend quick start

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

Server runs at `http://localhost:3000/api`.

### Auth rule

- Public APIs (no header required):
  - `GET /api/teams/health`
  - `GET /api/teams`
  - `GET /api/teams/:teamId/applications`
  - `GET /api/applications/health`
- All other APIs require header: `x-user-id: <user_id>`

### APIs

- Teams
  - `POST /api/teams`
  - `GET /api/teams`
  - `GET /api/teams/my`
  - `GET /api/teams/:teamId/applications`
  - `POST /api/teams/:teamId/quit`
- Applications
  - `POST /api/applications`
  - `GET /api/applications`
  - `POST /api/applications/:applyId/approve`
  - `POST /api/applications/:applyId/reject`

### Example requests

Create team:
```bash
curl -X POST http://localhost:3000/api/teams \
  -H "x-user-id: u_001" \
  -H "Content-Type: application/json" \
  -d '{
    "teamName":"NPU-CPU-Team",
    "topic":"一生一芯基础班",
    "maxMembers":4
  }'
```

Create application:
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "x-user-id: u_002" \
  -H "Content-Type: application/json" \
  -d '{
    "teamId":"<team_id>",
    "message":"我想加入"
  }'
```
