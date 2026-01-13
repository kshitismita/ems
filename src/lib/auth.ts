import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { IUser } from '@/models/User';
import Session from '@/models/Session';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
    employeeId?: string;
    sessionId?: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    expiresAt: Date;
}

export const generateTokenPair = async (user: AuthUser, userAgent?: string, ipAddress?: string): Promise<TokenPair> => {
    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;
    
    if (!secret || !refreshSecret) {
        throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be defined');
    }

    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            employeeId: user.employeeId,
            sessionId,
            type: 'access'
        },
        secret,
        { expiresIn: '15m' }
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
        {
            id: user.id,
            sessionId,
            type: 'refresh'
        },
        refreshSecret,
        { expiresIn: '7d' }
    );

    // Create session in database
    const session = new Session({
        userId: user.id,
        sessionId,
        refreshToken,
        accessToken,
        userAgent,
        ipAddress,
        lastActivity: now,
        expiresAt: refreshExpiresAt
    });

    await session.save();

    return {
        accessToken,
        refreshToken,
        sessionId,
        expiresAt
    };
};

export const generateToken = (user: AuthUser): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }

    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            employeeId: user.employeeId,
        },
        secret,
        { expiresIn: '7d' }
    );
};

export const verifyToken = (token: string): AuthUser => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }

    try {
        const decoded = jwt.verify(token, secret) as any;
        
        // Check if this is an access token
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }
        
        return {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            employeeId: decoded.employeeId,
            sessionId: decoded.sessionId
        };
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('TOKEN_EXPIRED');
        }
        throw new Error('Invalid token');
    }
};

export const verifyRefreshToken = async (refreshToken: string): Promise<{ user: AuthUser; session: any }> => {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!refreshSecret) {
        throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    try {
        const decoded = jwt.verify(refreshToken, refreshSecret) as any;
        
        // Check if this is a refresh token
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        // Find session in database
        const session = await Session.findOne({
            sessionId: decoded.sessionId,
            refreshToken,
            revoked: false,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            throw new Error('Session not found or expired');
        }

        // Find user
        const User = (await import('@/models/User')).default;
        const userDoc = await User.findById(session.userId);
        if (!userDoc || !userDoc.isActive) {
            throw new Error('User not found or inactive');
        }

        const user = createAuthUser(userDoc);
        
        return { user, session };
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('REFRESH_TOKEN_EXPIRED');
        }
        throw new Error('Invalid refresh token');
    }
};

export const refreshAccessToken = async (refreshToken: string, userAgent?: string, ipAddress?: string): Promise<TokenPair> => {
    const { user, session } = await verifyRefreshToken(refreshToken);
    
    // Generate new token pair
    const newTokenPair = await generateTokenPair(user, userAgent, ipAddress);
    
    // Update session with new tokens
    session.accessToken = newTokenPair.accessToken;
    session.refreshToken = newTokenPair.refreshToken;
    session.lastActivity = new Date();
    await session.save();
    
    return newTokenPair;
};

export const revokeSession = async (sessionId: string, reason?: string): Promise<void> => {
    const session = await Session.findOne({ sessionId });
    if (session) {
        session.revoke(reason || 'Manual revocation');
        await session.save();
    }
};

export const revokeAllUserSessions = async (userId: string, reason?: string): Promise<void> => {
    await Session.revokeAllByUserId(userId, reason);
};

export const updateSessionActivity = async (sessionId: string): Promise<void> => {
    await Session.updateOne(
        { sessionId },
        { lastActivity: new Date() }
    );
};

export const cleanupExpiredSessions = async (): Promise<void> => {
    await Session.cleanupExpired();
};

export const createAuthUser = (user: IUser): AuthUser => {
    return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        employeeId: user.employeeId,
    };
};

export const hasPermission = (user: AuthUser, requiredRole: 'admin' | 'employee'): boolean => {
    const roleHierarchy = {
        admin: 2,
        employee: 1,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
};

export const canAccessEmployee = (currentUser: AuthUser, targetEmployeeId: string): boolean => {
    if (currentUser.role === 'admin') return true;
    return currentUser.id === targetEmployeeId;
};

export const canAccessProject = (currentUser: AuthUser, projectAdminId: string, projectEmployees: string[]): boolean => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.id === projectAdminId) return true;
    return projectEmployees.includes(currentUser.id);
};
