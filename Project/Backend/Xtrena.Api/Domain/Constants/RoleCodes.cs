using System;

namespace Xtrena.Api.Domain.Constants;

public static class RoleCodes
{
    public const string Admin = "ADMIN";
    public const string Manager = "MANAGER";
    public const string Employee = "EMPLOYEE";

    // RoleCodes.All check 
    public static readonly IReadOnlyList<string> All = [ Admin, Manager, Employee ];
}
