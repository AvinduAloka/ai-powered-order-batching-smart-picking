using System;
using Microsoft.EntityFrameworkCore;
using Xtrena.Api.Features.Auth.Common;
using Xtrena.Api.Persistence;
using Xtrena.Api.SharedKernel.Errors;
using Xtrena.Api.SharedKernel.Identity;

namespace Xtrena.Api.Features.Auth.Me;

public static class Me
{
    public static RouteHandlerBuilder MapMe(this IEndpointRouteBuilder auth) =>
        auth.MapGet("/me", HandleAsync)
            .RequireAuthorization()
            .WithName("Me");

    private static async Task<IResult> HandleAsync(
        ICurrentUser caller, XtrenaDbContext db, CancellationToken ct)
    {
        var user = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Id == caller.RequireUserId(), ct)
            ?? throw new NotFoundException("User", caller.RequireUserId().ToString());

        return Results.Ok(AuthHelpers.ToAuthUser(AuthHelpers.MapProfile(user)));
    }
}
