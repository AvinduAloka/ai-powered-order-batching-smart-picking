using System;
using Xtrena.Api.Domain.Constants;

namespace Xtrena.Api.SharedKernel.Authorization;

public static class PermissionNames
{
    // users (SRS row 2)
    public const string UsersRead = "users.read";
    public const string UsersWrite = "users.write";
    public const string UsersDelete = "users.delete";
    // roles (row 3)
    public const string RolesRead = "roles.read";
    public const string RolesWrite = "roles.write";
    public const string RolesDelete = "roles.delete";
    // api clients (row 4)
    public const string ApiClientsManage = "apiClients.manage";
    // master data (row 5)
    public const string MasterDataRead = "masterData.read";
    public const string MasterDataWrite = "masterData.write";
    // locations (row 6)
    public const string LocationsRead = "locations.read";
    public const string LocationsWrite = "locations.write";
    // carts (row 7)
    public const string CartsRead = "carts.read";
    public const string CartsWrite = "carts.write";
    // employees (rows 8, 9)
    public const string EmployeesRead = "employees.read";
    public const string EmployeesWrite = "employees.write";
    public const string WorkloadView = "workload.view";
    // orders (rows 10, 11)
    public const string OrdersRead = "orders.read";
    public const string OrdersWrite = "orders.write";
    public const string OrdersDelete = "orders.delete";
    public const string OrdersValidate = "orders.validate";
    // optimisation (rows 12, 13)
    public const string OptimizationRun = "optimization.run";
    public const string OptimizationRead = "optimization.read";
    public const string OptimizationAssign = "optimization.assign";
    // discrepancies (row 14)
    public const string DiscrepanciesRead = "discrepancies.read";
    public const string DiscrepanciesResolve = "discrepancies.resolve";
    // receipts (row 15)
    public const string ReceiptsRead = "receipts.read";
    public const string ReceiptsWrite = "receipts.write";
    public const string ReceiptsVerify = "receipts.verify";
    // storage recommendations (row 16)
    public const string RecommendationsRead = "recommendations.read";
    public const string RecommendationsDecide = "recommendations.decide";
    // put-away (row 17)
    public const string PutAwayConfirm = "putaway.confirm";
    // inventory (rows 18, 19)
    public const string InventoryRead = "inventory.read";
    public const string InventoryAdjust = "inventory.adjust";
    public const string InventoryReserve = "inventory.reserve";
    // picking (rows 20, 21)
    public const string PickingView = "picking.view";
    public const string PickingRecord = "picking.record";
    // fulfilment (rows 22, 23)
    public const string AllocationExecute = "allocation.execute";
    public const string ShipmentExecute = "shipment.execute";
    // reporting (rows 24, 25)
    public const string ReportsView = "reports.view";
    public const string DashboardView = "dashboard.view";

    public static readonly IReadOnlyList<string> All =
    [
        UsersRead, UsersWrite, UsersDelete,
        RolesRead, RolesWrite, RolesDelete,
        ApiClientsManage,
        MasterDataRead, MasterDataWrite,
        LocationsRead, LocationsWrite,
        CartsRead, CartsWrite,
        EmployeesRead, EmployeesWrite, WorkloadView,
        OrdersRead, OrdersWrite, OrdersDelete, OrdersValidate,
        OptimizationRun, OptimizationRead, OptimizationAssign,
        DiscrepanciesRead, DiscrepanciesResolve,
        ReceiptsRead, ReceiptsWrite, ReceiptsVerify,
        RecommendationsRead, RecommendationsDecide,
        PutAwayConfirm,
        InventoryRead, InventoryAdjust, InventoryReserve,
        PickingView, PickingRecord,
        AllocationExecute, ShipmentExecute,
        ReportsView, DashboardView,
    ];

    private static readonly IReadOnlyList<string> ManagerOnly =
    [
        UsersWrite, UsersDelete, RolesWrite, RolesDelete, ApiClientsManage, OrdersDelete,
    ];

        private static readonly IReadOnlyList<string> EmployeeSet =
        [
            MasterDataRead, LocationsRead, CartsRead,
        OrdersRead, ReceiptsRead, RecommendationsRead,
        InventoryRead, PickingView, DiscrepanciesRead,
    ];

    // response permissions[] — role set
    public static IReadOnlyList<string> ForRoles(IEnumerable<string> roleCodes)
    {
        var roles = roleCodes.ToHashSet(StringComparer.Ordinal);
        var result = new HashSet<string>(StringComparer.Ordinal);

        if (roles.Contains(RoleCodes.Admin))
            result.UnionWith(All);
        if (roles.Contains(RoleCodes.Manager))
            result.UnionWith(All.Where(p => !ManagerOnly.Contains(p)));
        if (roles.Contains(RoleCodes.Employee))
            result.UnionWith(EmployeeSet);

        return result.ToArray();
    }
}
