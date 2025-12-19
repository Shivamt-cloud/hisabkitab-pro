import { UserPermissions, ModulePermission, PermissionModule, PermissionAction } from '../types/permissions'
import { UserRole, RolePermissions } from '../types/auth'
import { getAll, getById, put, deleteById, STORES } from '../database/db'

export const permissionService = {
  // Get permissions for a user
  getUserPermissions: async (userId: string): Promise<UserPermissions | null> => {
    const permission = await getById<UserPermissions>(STORES.USER_PERMISSIONS, userId)
    return permission || null
  },

  // Get all user permissions
  getAll: async (): Promise<UserPermissions[]> => {
    return await getAll<UserPermissions>(STORES.USER_PERMISSIONS)
  },

  // Save or update user permissions
  saveUserPermissions: async (permissions: UserPermissions): Promise<void> => {
    const updated: UserPermissions = {
      ...permissions,
      updatedAt: new Date().toISOString(),
    }
    await put(STORES.USER_PERMISSIONS, updated)
  },

  // Delete user permissions (will fall back to role-based)
  deleteUserPermissions: async (userId: string): Promise<void> => {
    await deleteById(STORES.USER_PERMISSIONS, userId)
  },

  // Check if user has specific permission
  hasPermission: async (
    userId: string,
    userRole: UserRole,
    permission: string
  ): Promise<boolean> => {
    // Format: "module:action" (e.g., "sales:create")
    const [module, action] = permission.split(':') as [PermissionModule, PermissionAction]
    
    // Get user's custom permissions
    const userPerms = await permissionService.getUserPermissions(userId)
    
    // If user has custom permissions enabled, use those
    if (userPerms && userPerms.useCustomPermissions) {
      const modulePerm = userPerms.customPermissions.find(p => p.module === module)
      if (modulePerm) {
        return modulePerm.actions.includes(action)
      }
      return false // If module not found in custom permissions, deny access
    }
    
    // Otherwise, use role-based permissions
    const rolePerms = RolePermissions[userRole]
    const resourcePerm = rolePerms.find(p => p.resource === module)
    
    if (!resourcePerm) return false
    return resourcePerm.actions.includes(action)
  },

  // Get effective permissions for a user (combines role + custom)
  getEffectivePermissions: async (userId: string, userRole: UserRole): Promise<ModulePermission[]> => {
    const userPerms = await permissionService.getUserPermissions(userId)
    
    if (userPerms && userPerms.useCustomPermissions) {
      return userPerms.customPermissions
    }
    
    // Convert role permissions to module permissions format
    const rolePerms = RolePermissions[userRole]
    return rolePerms.map(rp => ({
      module: rp.resource as PermissionModule,
      actions: rp.actions as PermissionAction[],
    }))
  },

  // Reset user permissions to role-based (delete custom permissions)
  resetToRolePermissions: async (userId: string): Promise<void> => {
    await permissionService.deleteUserPermissions(userId)
  },
}
