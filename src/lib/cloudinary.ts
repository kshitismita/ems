import { v2 as cloudinary } from 'cloudinary';

const cloudinaryUrl = (process.env.CLOUDINARY_URL || '').trim();
const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '').trim();
const apiKey = (process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '').trim();
const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

const config = {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
};

console.log('--- CLOUDINARY CONFIG VERIFICATION ---');
console.log('CLOUDINARY_URL present:', cloudinaryUrl ? 'yes' : 'no');
console.log('Cloud Name starts with:', config.cloud_name ? config.cloud_name.substring(0, 3) + '...' : '(missing)');
console.log('API Key starts with:', config.api_key ? config.api_key.substring(0, 3) + '...' : '(missing)');
console.log('API Secret starts with:', config.api_secret ? config.api_secret.substring(0, 3) + '...' : '(missing)');
console.log('--- END VERIFICATION ---');

if (cloudinaryUrl) {
    cloudinary.config(cloudinaryUrl);
} else {
    cloudinary.config({
        ...config,
        secure: true,
    });
}

const getCloudinaryConfigError = () => {
    if (cloudinaryUrl) return null;

    const missing: string[] = [];
    if (!config.cloud_name) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!config.api_key) missing.push('CLOUDINARY_API_KEY');
    if (!config.api_secret) missing.push('CLOUDINARY_API_SECRET');
    if (missing.length === 0) return null;

    return new Error(
        `Cloudinary is not configured. Missing: ${missing.join(', ')}. ` +
        'Create e.g. .env.local at the project root and set Cloudinary credentials, then restart the dev server.'
    );
};

export interface CloudinaryUploadResponse {
    secure_url: string;
    public_id: string;
    resource_type: string;
    format: string;
    bytes: number;
}

export const uploadToCloudinary = async (
    buffer: Buffer,
    folder: string = 'ems-reference-library'
): Promise<CloudinaryUploadResponse> => {
    const configError = getCloudinaryConfigError();
    if (configError) {
        throw configError;
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
                type: 'upload',
                access_mode: 'public',
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary Upload Error Details:', error);
                    return reject(
                        error instanceof Error
                            ? error
                            : new Error((error as any)?.message || JSON.stringify(error))
                    );
                }
                if (!result) return reject(new Error('Upload result is undefined'));
                resolve(result as CloudinaryUploadResponse);
            }
        );

        uploadStream.end(buffer);
    });
};

export default cloudinary;
