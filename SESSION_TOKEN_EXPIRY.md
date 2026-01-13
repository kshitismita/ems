# Session Token Expiry Implementation

This document explains the session token expiry system implemented in the EMS project.

## Overview

The implementation uses a dual-token system:
- **Access Token**: Short-lived (15 minutes)
- **Refresh Token**: Long-lived (7 days)
- **Session Management**: Database-backed session tracking

## Architecture

### 1. Token Flow
```
Login → Generate Token Pair → Store Session → Use Access Token → Auto-refresh → Continue Working
                                      ↓
                              Token Expires → Use Refresh Token → Get New Access Token
                                      ↓
                              Refresh Token Expires → Re-login Required
```

### 2. Key Components

#### Models
- `Session.ts`: Database model for session tracking
- Stores: userId, sessionId, tokens, activity, expiry, revocation status

#### Auth Library (`src/lib/auth.ts`)
- `generateTokenPair()`: Creates access + refresh tokens
- `verifyToken()`: Validates access tokens
- `verifyRefreshToken()`: Validates refresh tokens
- `refreshAccessToken()`: Generates new token pair
- `revokeSession()`: Invalidates specific session
- `revokeAllUserSessions()`: Invalidates all user sessions

#### Middleware (`src/middleware/auth.ts`)
- Validates access tokens on each request
- Updates session activity
- Handles token expiry responses
- Returns `requiresRefresh: true` for expired tokens

#### Client Token Manager (`src/lib/tokenManager.ts`)
- Automatic token refresh
- Axios interceptors for API calls
- Token storage (localStorage + cookies)
- Session management utilities

#### API Endpoints
- `/api/auth/login`: Generates token pair
- `/api/auth/refresh`: Refreshes expired tokens
- `/api/auth/logout`: Revokes sessions
- `/api/auth/sessions`: Lists/revokes active sessions

## Security Features

### 1. Token Expiry
- **Access Tokens**: 15 minutes (limits exposure if compromised)
- **Refresh Tokens**: 7 days (balances security + UX)
- **Sessions**: Auto-expire after 7 days

### 2. Session Tracking
- Database-backed session management
- Activity tracking on each request
- Session revocation capability
- Automatic cleanup of expired sessions

### 3. Secure Storage
- HttpOnly cookies for server-side access
- localStorage for client-side convenience
- Secure flag in production
- SameSite protection

### 4. Revocation System
- Manual session revocation
- Logout invalidates sessions
- All-sessions logout option
- Cleanup job for expired sessions

## Implementation Details

### Token Structure
```typescript
// Access Token Payload
{
  id: string,
  email: string,
  name: string,
  role: string,
  sessionId: string,
  type: 'access',
  exp: number
}

// Refresh Token Payload
{
  id: string,
  sessionId: string,
  type: 'refresh',
  exp: number
}
```

### Session Data
```typescript
{
  userId: string,
  sessionId: string,
  refreshToken: string,
  accessToken: string,
  userAgent?: string,
  ipAddress?: string,
  lastActivity: Date,
  expiresAt: Date,
  revoked: boolean,
  createdAt: Date
}
```

## Usage Examples

### Client-side Usage
```typescript
import { tokenManager } from '@/lib/tokenManager';

// Check if authenticated
if (tokenManager.isAuthenticated()) {
  // Make API calls - tokens handled automatically
  const response = await axios.get('/api/projects');
}

// Manual logout
await tokenManager.logout();

// Logout all devices
await tokenManager.logout(true);
```

### Server-side Usage
```typescript
import { withAuth } from '@/middleware/auth';

// Protected API route
export const GET = withAuth(async (req, user) => {
  // User is authenticated, session is valid
  return NextResponse.json({ user });
});

// Admin-only route
export const POST = withAuth(async (req, user) => {
  // Only admins can access
}, 'admin');
```

## Configuration

### Environment Variables
```env
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

### Token Expiry Times
- Access Token: 15 minutes
- Refresh Token: 7 days
- Session Cleanup: Every hour

## Migration Notes

### Backward Compatibility
- Legacy token system still supported
- Login returns both legacy and new tokens
- Gradual migration possible

### Database Changes
- New `sessions` collection created
- No changes to existing user data
- Automatic cleanup of expired sessions

## Monitoring & Maintenance

### Session Cleanup
```typescript
import { scheduleSessionCleanup } from '@/lib/sessionCleanup';

// Schedule cleanup job (run in app startup)
scheduleSessionCleanup();
```

### Session Monitoring
```typescript
// Get active sessions
const sessions = await Session.findActiveByUserId(userId);

// Cleanup expired sessions
await cleanupExpiredSessions();
```

## Security Best Practices

1. **Short Access Tokens**: Minimize exposure window
2. **Secure Refresh Tokens**: HttpOnly, encrypted storage
3. **Session Tracking**: Database-backed validation
4. **Activity Monitoring**: Track user sessions
5. **Revocation**: Immediate invalidation capability
6. **Cleanup**: Regular expired session removal

## Troubleshooting

### Common Issues

1. **Token Expired Errors**
   - Check token expiry time
   - Verify refresh token validity
   - Ensure session not revoked

2. **Session Not Found**
   - Check session ID in token
   - Verify session not expired
   - Check database connection

3. **Refresh Failed**
   - Verify refresh token secret
   - Check user account status
   - Ensure session not revoked

### Debug Logging
```typescript
// Enable debug logging
console.log('[AUTH] Token verification:', { userId, sessionId });
console.log('[SESSION] Activity updated:', { sessionId, lastActivity });
```

## Future Enhancements

1. **Device Fingerprinting**: Additional session security
2. **IP Binding**: Optional IP-based session validation
3. **Concurrent Session Limits**: Maximum active sessions per user
4. **Suspicious Activity Detection**: Anomaly-based security
5. **Session Analytics**: Usage patterns and insights
