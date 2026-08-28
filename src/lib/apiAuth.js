import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

/**
 * Validate incoming API request authentication & role permissions.
 * @param {import('next').NextApiRequest} req 
 * @param {import('next').NextApiResponse} res 
 * @param {Object} options 
 * @param {string[]} [options.roles] Allowed roles, e.g. ['owner'] or ['owner', 'staff']
 * @returns {Promise<{ user: any } | null>} Returns user token payload if authorized, or sends response & returns null.
 */
export async function authenticateApi(req, res, options = {}) {
  try {
    const token = await getToken({ req, secret });

    if (!token) {
      res.status(401).json({ error: "Unauthorized: Please sign in to access this resource." });
      return null;
    }

    const { roles } = options;
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const userRole = token.role || "staff";
      const isAllowed = roles.includes(userRole);

      if (!isAllowed) {
        res.status(403).json({ error: "Forbidden: You do not have permission to perform this action." });
        return null;
      }
    }

    return { user: token };
  } catch (err) {
    console.error("API Auth Error:", err);
    res.status(500).json({ error: "Internal authentication error." });
    return null;
  }
}

/**
 * Higher-Order Function to wrap API handlers with authentication & RBAC.
 * @param {Function} handler 
 * @param {Object} options 
 * @param {string[]} [options.roles] E.g. ['owner'] or ['owner', 'staff']
 */
export function withAuth(handler, options = {}) {
  return async (req, res) => {
    const auth = await authenticateApi(req, res, options);
    if (!auth) return; // Response already sent

    req.user = auth.user;
    return handler(req, res);
  };
}
