using System;
using Microsoft.EntityFrameworkCore;
using Xtrena.Api.Domain.Constants;
using Xtrena.Api.Persistence;

namespace Xtrena.Api.Features.Users.ListUsers;

public static class ListUsers
{
    public static RouteHandlerBuilder MapListUsers(this IEndpointRouteBuilder users) =>
        users.MapGet("", HandleAsync)                                   // "" = /api/v1/users
            .RequireAuthorization(p => p.RequireRole(RoleCodes.Admin))
            .WithName("ListUsers");

    private static async Task<IResult> HandleAsync(
        XtrenaDbContext db, string? q, int page = 1, int size = 20,
        CancellationToken ct = default)
    {
        page = Math.Max(page, 1);
        size = Math.Clamp(size, 1, 100);

        var query = db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(u =>
                u.Username.Contains(q) || u.FullName.Contains(q) || u.Email.Contains(q));

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderBy(u => u.Username)
            .Skip((page - 1) * size).Take(size)
            .Select(u => new
            {
                id = u.Id,
                username = u.Username,
                fullName = u.FullName,
                email = u.Email,
                isActive = u.IsActive,
                roles = u.UserRoles.Select(ur => ur.Role.Code).ToList(),
                employeeId = u.EmployeeId,
                lastLoginAtUtc = u.LastLoginAtUtc,
            })
            .ToListAsync(ct);

        return Results.Ok(new { total, page, size, rows });
    }
}
