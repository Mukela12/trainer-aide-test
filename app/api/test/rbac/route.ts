import { NextResponse } from 'next/server';
import {
  UserRole,
  ROLE_DASHBOARDS,
  ROLE_LABELS,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessTrainerAide,
  canBuildTemplates,
  canRunSessions,
  canAssignToClients,
  canManageTeam,
  canManageLocations,
  isSoloPractitioner,
  isAdminRole,
  isTrainerRole,
} from '@/lib/permissions';

const ALL_ROLES: UserRole[] = [
  'super_admin',
  'solo_practitioner',
  'studio_owner',
  'studio_manager',
  'trainer',
  'receptionist',
  'finance_manager',
  'client',
];

/**
 * Expected permission matrix for validation
 * true = should have permission, false = should NOT
 */
const EXPECTED: Record<string, Record<UserRole, boolean>> = {
  // Trainer Aide
  'trainer_aide:templates:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: true, client: false,
  },
  'trainer_aide:templates:create': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'trainer_aide:templates:edit': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'trainer_aide:templates:delete': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'trainer_aide:assign:clients': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: false, finance_manager: false, client: false,
  },
  'trainer_aide:progress:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: false, finance_manager: false, client: true,
  },
  'trainer_aide:sessions:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: true, client: true,
  },
  'trainer_aide:sessions:create': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: false, finance_manager: false, client: false,
  },
  'trainer_aide:sessions:complete': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: false, finance_manager: false, client: false,
  },
  // Clients
  'clients:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: true, client: false,
  },
  'clients:create': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: false, client: false,
  },
  'clients:edit': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: false, client: false,
  },
  'clients:delete': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  // Bookings
  'bookings:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: true, client: true,
  },
  'bookings:create': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: false, client: true,
  },
  'bookings:edit': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: false, client: false,
  },
  'bookings:cancel': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: true, finance_manager: false, client: false,
  },
  // Schedule
  'schedule:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: false, client: true,
  },
  'schedule:manage': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  // Services
  'services:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: true, client: true,
  },
  'services:create': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'services:edit': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'services:delete': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: false,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  // Packages
  'packages:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: true, client: true,
  },
  'packages:create': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'packages:edit': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'packages:delete': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: false,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  // Team
  'team:view': {
    super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'team:invite': {
    super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'team:manage': {
    super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'team:remove': {
    super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: false,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  // Locations
  'locations:view': {
    super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'locations:create': {
    super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: false,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'locations:edit': {
    super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: false,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  'locations:delete': {
    super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: false,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
  // Settings
  'settings:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: true, receptionist: true, finance_manager: true, client: true,
  },
  'settings:edit': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: false,
    trainer: false, receptionist: false, finance_manager: false, client: true,
  },
  // Finance
  'finance:view': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
    trainer: false, receptionist: false, finance_manager: true, client: false,
  },
  'finance:manage': {
    super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: false,
    trainer: false, receptionist: false, finance_manager: true, client: false,
  },
  // Admin
  'admin:full_access': {
    super_admin: true, solo_practitioner: false, studio_owner: false, studio_manager: false,
    trainer: false, receptionist: false, finance_manager: false, client: false,
  },
};

/**
 * GET /api/test/rbac
 * Validates the entire RBAC permission matrix and helper functions
 */
export async function GET() {
  const results: {
    permissionMatrix: { total: number; passed: number; failed: number; failures: string[] };
    helperFunctions: { total: number; passed: number; failed: number; failures: string[] };
    dashboardRouting: { total: number; passed: number; failed: number; failures: string[] };
    roleLabels: Record<string, string>;
  } = {
    permissionMatrix: { total: 0, passed: 0, failed: 0, failures: [] },
    helperFunctions: { total: 0, passed: 0, failed: 0, failures: [] },
    dashboardRouting: { total: 0, passed: 0, failed: 0, failures: [] },
    roleLabels: {},
  };

  // 1. Test full permission matrix
  for (const [permission, roleExpectations] of Object.entries(EXPECTED)) {
    for (const role of ALL_ROLES) {
      results.permissionMatrix.total++;
      const expected = roleExpectations[role];
      const actual = hasPermission(role, permission as any);
      if (actual === expected) {
        results.permissionMatrix.passed++;
      } else {
        results.permissionMatrix.failed++;
        results.permissionMatrix.failures.push(
          `${role} + ${permission}: expected ${expected}, got ${actual}`
        );
      }
    }
  }

  // 2. Test helper functions
  const helperTests: [string, (role: UserRole) => boolean, Record<UserRole, boolean>][] = [
    ['canAccessTrainerAide', canAccessTrainerAide, {
      super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
      trainer: true, receptionist: true, finance_manager: true, client: true,
    }],
    ['canBuildTemplates', canBuildTemplates, {
      super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
      trainer: false, receptionist: false, finance_manager: false, client: false,
    }],
    ['canRunSessions', canRunSessions, {
      super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
      trainer: true, receptionist: false, finance_manager: false, client: false,
    }],
    ['canAssignToClients', canAssignToClients, {
      super_admin: true, solo_practitioner: true, studio_owner: true, studio_manager: true,
      trainer: true, receptionist: false, finance_manager: false, client: false,
    }],
    ['canManageTeam', canManageTeam, {
      super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: true,
      trainer: false, receptionist: false, finance_manager: false, client: false,
    }],
    ['canManageLocations', canManageLocations, {
      super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: false,
      trainer: false, receptionist: false, finance_manager: false, client: false,
    }],
    ['isSoloPractitioner', isSoloPractitioner, {
      super_admin: false, solo_practitioner: true, studio_owner: false, studio_manager: false,
      trainer: false, receptionist: false, finance_manager: false, client: false,
    }],
    ['isAdminRole', isAdminRole, {
      super_admin: true, solo_practitioner: false, studio_owner: true, studio_manager: true,
      trainer: false, receptionist: false, finance_manager: false, client: false,
    }],
    ['isTrainerRole', isTrainerRole, {
      super_admin: false, solo_practitioner: true, studio_owner: false, studio_manager: false,
      trainer: true, receptionist: false, finance_manager: false, client: false,
    }],
  ];

  for (const [fnName, fn, expectations] of helperTests) {
    for (const role of ALL_ROLES) {
      results.helperFunctions.total++;
      const expected = expectations[role];
      const actual = fn(role);
      if (actual === expected) {
        results.helperFunctions.passed++;
      } else {
        results.helperFunctions.failed++;
        results.helperFunctions.failures.push(
          `${fnName}(${role}): expected ${expected}, got ${actual}`
        );
      }
    }
  }

  // 3. Test dashboard routing
  const expectedDashboards: Record<UserRole, string> = {
    super_admin: '/studio-owner',
    solo_practitioner: '/solo',
    studio_owner: '/studio-owner',
    studio_manager: '/studio-owner',
    trainer: '/trainer',
    receptionist: '/trainer',
    finance_manager: '/studio-owner',
    client: '/client',
  };

  for (const role of ALL_ROLES) {
    results.dashboardRouting.total++;
    const expected = expectedDashboards[role];
    const actual = ROLE_DASHBOARDS[role];
    if (actual === expected) {
      results.dashboardRouting.passed++;
    } else {
      results.dashboardRouting.failed++;
      results.dashboardRouting.failures.push(
        `${role} dashboard: expected "${expected}", got "${actual}"`
      );
    }
  }

  // 4. Role labels
  for (const role of ALL_ROLES) {
    results.roleLabels[role] = ROLE_LABELS[role];
  }

  const totalTests =
    results.permissionMatrix.total +
    results.helperFunctions.total +
    results.dashboardRouting.total;
  const totalPassed =
    results.permissionMatrix.passed +
    results.helperFunctions.passed +
    results.dashboardRouting.passed;
  const totalFailed =
    results.permissionMatrix.failed +
    results.helperFunctions.failed +
    results.dashboardRouting.failed;

  return NextResponse.json({
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      allPassed: totalFailed === 0,
    },
    results,
  });
}
