import jwt from 'jsonwebtoken';
import { IUser } from '@/models/User';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
    employeeId?: string;
}

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

        return {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            employeeId: decoded.employeeId,
        };
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('TOKEN_EXPIRED');
        }
        throw new Error('Invalid token');
    }
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

