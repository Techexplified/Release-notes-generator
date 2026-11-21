/**
 * Serverless fallback endpoint for release notes file download.
 * Stateless: never stores, writes, or logs user release notes.
 *
 * Method: POST
 * Accepts: JSON or application/x-www-form-urlencoded
 * Headers: Content-Disposition attachment, Content-Security-Policy sandbox
 */

const ALLOWED_FORMATS = {
  md: { ext: 'md', mime: 'text/markdown; charset=utf-8' },
  html: { ext: 'html', mime: 'text/html; charset=utf-8' },
  txt: { ext: 'txt', mime: 'text/plain; charset=utf-8' }
};

const MAX_BYTES = 1000000; // 1 MB limit

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return new Promise((resolve) => {
    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk;
      if (bodyStr.length > MAX_BYTES * 2) {
        req.destroy();
        resolve(null);
      }
    });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          resolve(JSON.parse(bodyStr));
        } catch {
          resolve(null);
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        try {
          const params = new URLSearchParams(bodyStr);
          const obj = {};
          for (const [k, v] of params.entries()) {
            obj[k] = v;
          }
          resolve(obj);
        } catch {
          resolve(null);
        }
      } else {
        // Attempt JSON fallback
        try {
          resolve(JSON.parse(bodyStr));
        } catch {
          resolve(null);
        }
      }
    });
  });
}

export default async function handler(req, res) {
  // Method check
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(405).send('Method Not Allowed');
  }

  // Origin check
  const origin = req.headers['origin'];
  const host = req.headers['host'];
  const appOrigin = process.env.APP_ORIGIN;

  if (origin) {
    let allowed = false;
    try {
      const originUrl = new URL(origin);
      if (appOrigin) {
        const appUrl = new URL(appOrigin);
        if (originUrl.origin === appUrl.origin) {
          allowed = true;
        }
      }
      if (!allowed && host) {
        if (originUrl.host === host) {
          allowed = true;
        }
      }
    } catch {
      allowed = false;
    }

    if (!allowed) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(403).send('Forbidden');
    }
  }

  // Parse body
  const body = await parseBody(req);
  if (!body || typeof body !== 'object') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(400).send('Bad Request: Invalid body payload');
  }

  const { format, filename, content } = body;

  // Validate format
  const formatConfig = ALLOWED_FORMATS[format];
  if (!formatConfig) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(400).send('Bad Request: Unsupported format. Allowed: md, html, txt');
  }

  // Validate content
  if (typeof content !== 'string') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(400).send('Bad Request: content must be a string');
  }

  const contentBytes = Buffer.byteLength(content, 'utf8');
  if (contentBytes > MAX_BYTES) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(413).send('Payload Too Large: maximum export size is 1MB');
  }

  // Sanitize filename
  const rawName = typeof filename === 'string' ? filename.trim() : '';
  const sanitizedBase = rawName
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 70);

  const safeFilename = `${sanitizedBase || 'release-notes'}.${formatConfig.ext}`;
  const asciiSafe = safeFilename.replace(/[^\x20-\x7E]/g, '_');
  const percentEncoded = encodeURIComponent(safeFilename);

  // Send response headers
  res.setHeader('Content-Type', formatConfig.mime);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiSafe}"; filename*=UTF-8''${percentEncoded}`
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox;");

  return res.status(200).send(content);
}
