export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'employee';
    employeeId?: string;
}

// Simple JWT verification for Edge Runtime
export const verifyTokenEdge = (token: string): AuthUser => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }

    try {
        // Split token into parts
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token structure');
        }

        // Decode payload (base64)
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        // Basic expiration check
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            throw new Error('TOKEN_EXPIRED');
        }

        return {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            role: payload.role,
            employeeId: payload.employeeId,
        };
    } catch (error: any) {
        if (error.message === 'TOKEN_EXPIRED') {
            throw error;
        }
        throw new Error('Invalid token');
    }
};
