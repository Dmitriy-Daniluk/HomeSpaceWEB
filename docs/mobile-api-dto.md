# HomeSpace Mobile API DTO

This document keeps the mobile app contract stable while the web app evolves.

## Auth

`POST /api/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "data": {
    "token": "jwt",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "fullName": "User Name",
      "avatarUrl": "/uploads/avatar.png",
      "has_subscription": false,
      "subscription_until": null
    }
  }
}
```

## Families

`GET /api/families`

Family item:

```json
{
  "id": 1,
  "name": "Family",
  "role": "parent",
  "savings_goal": 50000,
  "invite_code": "ABC123",
  "members": [
    {
      "id": 1,
      "email": "user@example.com",
      "fullName": "User Name",
      "role": "parent",
      "avatarUrl": null
    }
  ]
}
```

## Tasks

`GET /api/tasks?familyId=1`

Task item:

```json
{
  "id": 1,
  "family_id": 1,
  "title": "Buy groceries",
  "description": "Milk and bread",
  "deadline": "2026-04-20T12:00:00.000Z",
  "priority": "medium",
  "status": "new",
  "creator_id": 1,
  "executor_id": 2,
  "attachment_count": 0
}
```

`PUT /api/tasks/:id`

Partial updates are supported:

```json
{
  "status": "done"
}
```

## Budget

`GET /api/budget?familyId=1&period=month`

Transaction item:

```json
{
  "id": 1,
  "family_id": 1,
  "amount": "1200.00",
  "type": "expense",
  "category": "Food",
  "description": "Groceries",
  "transaction_date": "2026-04-20T10:00:00.000Z"
}
```

Free users can receive `meta.limitedBySubscription=true` and a limited date window.

## Files

Upload:

`POST /api/files/upload` as `multipart/form-data`

Fields:

```text
file
familyId
file_type = receipt | document | image | other
relatedTaskId
relatedTransactionId
```

File item:

```json
{
  "id": 1,
  "file_path": "/uploads/file.pdf",
  "file_name": "Receipt.pdf",
  "file_type": "receipt",
  "file_size": 12345
}
```

## Chat

`GET /api/chat/:familyId`

Message item:

```json
{
  "id": 1,
  "content": "Hello",
  "attachmentUrl": "/uploads/file.pdf",
  "senderId": 1,
  "senderName": "User Name",
  "isOwn": true,
  "createdAt": "2026-04-20T10:00:00.000Z"
}
```

`PUT /api/chat/:id` edits only the sender's message.

`DELETE /api/chat/:id` deletes sender messages; parents can delete family messages.

## Location

`POST /api/location/update`

Request:

```json
{
  "latitude": 55.7558,
  "longitude": 37.6173,
  "accuracy": 20
}
```

The API returns decrypted coordinates to authorized family members, while new database rows store encrypted coordinates in `encrypted_latitude`, `encrypted_longitude`, and `encrypted_accuracy`.

`DELETE /api/location/me` removes all saved location points for the current user.
