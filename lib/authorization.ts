export type AppRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

const permissions = {
  CUSTOMER: ["order:create", "order:read:self"],
  ADMIN: ["order:read", "order:update", "product:write", "settings:write", "journey:read"],
  SUPER_ADMIN: ["order:read", "order:update", "product:write", "settings:write", "journey:read", "user:manage", "audit:read"],
} as const;

export function assertPermission(role: AppRole, permission: string) {
  if (!(permissions[role] as readonly string[]).includes(permission)) {
    throw new Error("FORBIDDEN");
  }
}
