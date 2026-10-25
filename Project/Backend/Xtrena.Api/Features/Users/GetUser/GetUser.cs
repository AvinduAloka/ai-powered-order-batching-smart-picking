using System;
using Microsoft.EntityFrameworkCore;
using Xtrena.Api.Persistence;
using Xtrena.Api.SharedKernel.Errors;

namespace Xtrena.Api.Features.Users.GetUser;

public static class GetUser
{
    public static RouteHandlerBuilder MapGetUser(this IEndpointRouteBuilder users) =>
        users.MapGet("/{id:guid}", HandleAsync)
            .RequireAuthorization()
            .WithName("GetUser");

    private static async Task<IResult> HandleAsync(Guid id, XtrenaDbContext db, CancellationToken ct)
    {
        var row = await db.Users
            .Where(u => u.Id == id)
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
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("User", id.ToString());

        return Results.Ok(row);
    }
}
