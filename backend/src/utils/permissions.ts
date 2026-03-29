export type RolePermissions = {
  submitExpense: boolean;
  viewOwnExpenses: boolean;
  viewApprovalStatus: boolean;
  approveExpenses: boolean;
  viewTeamExpenses: boolean;
  manageTeamRoles: boolean;
  manageTeamMembers: boolean;
  configureApprovalFlow: boolean;
};

export function defaultEmployeePermissions(): RolePermissions {
  return {
    submitExpense: true,
    viewOwnExpenses: true,
    viewApprovalStatus: true,
    approveExpenses: false,
    viewTeamExpenses: false,
    manageTeamRoles: false,
    manageTeamMembers: false,
    configureApprovalFlow: false,
  };
}

export function defaultManagerPermissions(): RolePermissions {
  return {
    submitExpense: true,
    viewOwnExpenses: true,
    viewApprovalStatus: true,
    approveExpenses: true,
    viewTeamExpenses: true,
    manageTeamRoles: false,
    manageTeamMembers: false,
    configureApprovalFlow: false,
  };
}

export function mergePermissions(
  base: RolePermissions,
  partial: Partial<Record<keyof RolePermissions, boolean>>,
): RolePermissions {
  return { ...base, ...partial };
}
