import { getServerSession } from "next-auth/next";

import { redirect } from "next/navigation";

export async function requireRole(allowedRoles) {
  const session = await getServerSession(authOptions);

  if (!session || !allowedRoles.includes(session.user.role)) {
    redirect("/no-permission");
  }

  return session;
}
