# Authentication service

A simple authentication service.

## Why?

Educational purposes.

## API

### Sign up

Create a new user.

#### Example

How to sign up a user with username `johndoe`:

```
POST /users/johndoe HTTP/1.1
[...]

{
  "firstName": "John",
  "password": "correcthorsebatterystaple"
}
```

### Log in

Exchange client credentials for a session token.

#### Example

How to sign in using `johndoe`'s credentials:

```
POST /users/johndoe/sessions HTTP/1.1
[...]

{
  "password": "correcthorsebatterystaple"
}
```

### Log out

Invalidate a session token.

#### Example

How to invalidate `johndoe`'s session with id `12tndiu2t3hudicau`.

```
DELETE /users/johndoe/sessions/12tndiu2t3hudicau HTTP/1.1
[...]
Authorization: 12tndiu2t3hudicau
```

### Read user attributes

Retrieve user attributes.

#### Example

How to retrieve `johndoe`'s attributes. `12tndiu2t3hudicau` is a valid session token obtained through log in.

```
GET /users/johndoe HTTP/1.1
[...]
Authorization: 12tndiu2t3hudicau
```
