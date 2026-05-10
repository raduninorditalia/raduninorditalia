# Security Specification - Raduni Nord Italia

## 1. Data Invariants
- A `User` profile must match the `request.auth.uid`.
- A `Spot` can only be created by an authenticated user and must reference their username.
- An `Event` can only be created by users with 'organizer' or 'admin' roles.
- The `role` field in a `User` profile is immutable for regular users and organizers.
- Timestamps and IDs must be validated to prevent resource exhaustion and identity spoofing.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Theft (User Profile)**: Create a `users` document with an ID different from `request.auth.uid`.
2. **Role Escalation**: Update own `role` to 'admin'.
3. **Ghost Profile**: Create a user profile without a `username`.
4. **Spot Spoofing**: Create a `Spot` with `spotted_by` set to another user's username.
5. **Event Hijacking**: An 'user' role tries to create an `Event`.
6. **Denial of Wallet (ID Poisoning)**: Write a document with a 2MB string as the document ID.
7. **Denial of Wallet (Payload Bloat)**: Write a `Spot` with a 10MB `image_data` string (Firestore limit is 1MB anyway, but rules check size).
8. **Orphaned Writes**: Create a `Spot` without a `car_model`.
9. **Timestamp Manipulation**: Set `created_at` to a future date instead of `request.time`.
10. **Shadow Update**: Add a hidden `isVerified: true` field to a `Spot` document during update.
11. **Bypassing Relation**: Update an `Event` created by someone else.
12. **PII Leak**: Unauthenticated user tries to read all user profiles.

## 3. Test Runner Definition
(Implemented in `firestore.rules.test.ts` - conceptual)
- `it('rejects identity theft')`
- `it('prevents self-assignment of admin role')`
- `it('mandates valid car_model in shots')`
- ...
