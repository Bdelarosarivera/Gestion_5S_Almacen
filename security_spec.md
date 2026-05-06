# Security Specification for 5S Audit Manager

## Data Invariants
- Every `auditRecord` must have a valid `userId` matching the authenticated user.
- Every `actionItem` must have a valid `userId` matching the authenticated user.
- `appConfig` is per-user and must be owned by the authenticated user.
- Only the owner can read, create, update, or delete their own data.
- Timestamps and IDs must follow strict formats.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing (Audits)**: Attempt to create an audit with a `userId` that isn't mine.
2. **Identity Spoofing (Actions)**: Attempt to create an action with a `userId` that isn't mine.
3. **Data Modification (Unauthorized)**: Attempt to edit someone else's audit record.
4. **Data Modification (Unauthorized)**: Attempt to edit someone else's action item.
5. **Config Hijacking**: Attempt to read or write someone else's config.
6. **Bypassing Validation (Empty Area)**: Create an audit with an empty `area` string.
7. **Bypassing Validation (Malformed ID)**: Create a record with a junk document ID.
8. **Resource Exhaustion**: Send a massive string in `suggestedAction`.
9. **State Shortcut (Actions)**: Update an action to 'CLOSED' without providing required fields (simulated via bypass).
10. **Immortality Breach**: Attempt to change the `createdAt` date of an action.
11. **Email Spoofing (if applicable)**: Not used here as we rely on `request.auth.uid`.
12. **Blanket Query**: Attempt to list all audits in the collection without a user filter.

## The Test Runner (Plan)
I will implement `firestore.rules` that enforce:
- `request.auth.uid == resource.data.userId` for all operations.
- `isValidId()` for path variables.
- Type and size checks for all fields.
- Immutability for `createdAt`.
