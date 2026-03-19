# Study Session API Documentation

## Base URL

```
http://localhost:3000/api/session
```

## Authentication

All endpoints require a JWT Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Create Study Session

**POST** `/api/session/create`

**Request Body:**

```json
{
  "title": "Biology Revision"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid-string",
  "user_id": "user-uuid",
  "title": "Biology Revision",
  "created_at": "2026-03-17T08:00:00.000Z"
}
```

**Error Responses:**

- 400: Missing or invalid title
- 401: Unauthorized (no token or invalid token)

---

### 2. Get All Study Sessions

**GET** `/api/session/list`

**Response (200 OK):**

```json
{
  "sessions": [
    {
      "id": "uuid-string",
      "user_id": "user-uuid",
      "title": "Biology Revision",
      "created_at": "2026-03-17T08:00:00.000Z"
    },
    {
      "id": "uuid-string-2",
      "user_id": "user-uuid",
      "title": "Math Practice",
      "created_at": "2026-03-16T10:00:00.000Z"
    }
  ],
  "total": 2
}
```

---

### 3. Get Single Study Session

**GET** `/api/session/:id`

**Response (200 OK):**

```json
{
  "id": "uuid-string",
  "user_id": "user-uuid",
  "title": "Biology Revision",
  "created_at": "2026-03-17T08:00:00.000Z"
}
```

**Error Responses:**

- 404: Session not found
- 401: Unauthorized

---

### 4. Update Study Session

**PATCH** `/api/session/:id`

**Request Body:**

```json
{
  "title": "Updated Biology Notes"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid-string",
  "user_id": "user-uuid",
  "title": "Updated Biology Notes",
  "created_at": "2026-03-17T08:00:00.000Z"
}
```

---

### 5. Delete Study Session

**DELETE** `/api/session/:id`

**Response (200 OK):**

```json
{
  "message": "Study session deleted successfully"
}
```

**Error Responses:**

- 404: Session not found
- 401: Unauthorized

---

## Example API Calls

### Using fetch in React Native

```typescript
const token = await getToken(); 

const response = await fetch('http://localhost:3000/api/session/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ title: 'Biology Revision' }),
});

const response = await fetch('http://localhost:3000/api/session/list', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Delete session
const response = await fetch('http://localhost:3000/api/session/session-id', {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

---

## Security Notes

1. All endpoints are protected with JWT authentication
2. Users can only access their own sessions (enforced at both API and database level)
3. The database uses Row Level Security (RLS) policies for additional protection
