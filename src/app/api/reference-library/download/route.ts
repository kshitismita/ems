import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import fs from 'fs';
import path from 'path';

function logToDebug(message: string) {
  const logEntry = `[${new Date().toISOString()}] DOWNLOAD DIAGNOSTIC: ${message}\n`;
  fs.appendFileSync(path.join(process.cwd(), 'api-debug.log'), logEntry);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return NextResponse.json({ error: 'Missing file URL' }, { status: 400 });
  }

  try {
    logToDebug(`Attempting to fetch document from source: ${fileUrl}`);
    // Try direct fetch first
    let response = await fetch(fileUrl);

    // If 401, try to generate a signed URL
    if (response.status === 401) {
      logToDebug(`Got 401 from Cloudinary, attempting to generate signed URL for: ${fileUrl}`);


      // if (!cloudName || !apiKey || !apiSecret) {
      //   console.error('Missing Cloudinary credentials for signing');
      //   return NextResponse.json(
      //     { error: 'Unauthorized and missing credentials for signing', details: 'cloud_name/api_key/api_secret missing in env' },
      //     { status: 401 }
      //   );
      // }

      try {
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split('/');

        // Find 'upload' or 'authenticated' in path
        const uploadIndex = pathParts.findIndex(p => p === 'upload' || p === 'authenticated');

        if (uploadIndex !== -1) {
          const resourceType = pathParts[uploadIndex - 1] === 'upload' ? 'auto' : pathParts[uploadIndex - 1];
          let remainingParts = pathParts.slice(uploadIndex + 1);

          // Skip version if present
          if (remainingParts.length > 0 && /^v\d+$/.test(remainingParts[0])) {
            remainingParts = remainingParts.slice(1);
          }

          let publicIdWithFolder = remainingParts.join('/');

          // For PDFs and other assets, Cloudinary often needs the extension for 'image' or 'video' resource types
          // if they are signed. However, if it's 'raw', the extension is part of the public_id.
          // Let's detect if it's a PDF and adjust.
          const isPdf = fileUrl.toLowerCase().endsWith('.pdf');

          logToDebug(`Signing URL for: public_id=${publicIdWithFolder}, resource_type=${resourceType}, isPdf=${isPdf}`);

          // Generate signed URL
          // We use cloudinary.url with sign_url: true. 
          // For PDFs uploaded as 'image', we might need to specify the format.
          const options: any = {
            resource_type: resourceType === 'auto' ? 'image' : resourceType,
            secure: true,
            sign_url: true,
          };

          if (isPdf && options.resource_type === 'image') {
            options.format = 'pdf';
            // If it has .pdf extension in publicId, remove it for the options.format logic
            if (publicIdWithFolder.toLowerCase().endsWith('.pdf')) {
              publicIdWithFolder = publicIdWithFolder.substring(0, publicIdWithFolder.length - 4);
            }
          }

          const signedUrl = cloudinary.url(publicIdWithFolder, options);

          logToDebug(`Generated signed URL: ${signedUrl}`);
          response = await fetch(signedUrl);
          logToDebug(`Fetch with signed URL status: ${response.status}`);
        } else {
          logToDebug(`Could not parse Cloudinary URL structure: ${fileUrl}`);
        }
      } catch (signError: any) {
        logToDebug(`Failed to generate signed URL: ${signError.message}`);
      }
    }

    if (!response.ok) {
      logToDebug(`Source fetch failed with status ${response.status}: ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to retrieve asset from cloud', status: response.status, url: fileUrl },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const buffer = await response.arrayBuffer();

    // Try to extract filename from URL (Cloudinary pattern)
    const urlParts = new URL(fileUrl).pathname.split('/');
    const filenamePart = urlParts[urlParts.length - 1];
    const filename = filenamePart.includes('.') ? filenamePart : 'download';

    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(buffer, { headers });
  } catch (error: any) {
    console.error('Download proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy file download', details: error.message },
      { status: 500 }
    );
  }
}
