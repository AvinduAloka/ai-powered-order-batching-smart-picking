using System;
using Xtrena.Api.Features.Auth.Common;
using Xtrena.Api.Persistence;
using Xtrena.Api.SharedKernel.Identity;
using Microsoft.EntityFrameworkCore;

namespace Xtrena.Api.Features.Auth.Logout;

public static class Logout
{
    public static RouteHandlerBuilder MapLogout(this IEndpointRouteBuilder auth) =>
        auth.MapPost("/logout", HandleAsync)
            .RequireAuthorization()
            .WithName("Logout");

    private static async Task<IResult> HandleAsync(
        HttpContext ctx, ICurrentUser caller, XtrenaDbContext db,
        IJwtTokenService tokens, CancellationToken ct)
    {
        if (ctx.Request.Cookies.TryGetValue(AuthHelpers.RefreshCookieName, out var raw))
        {
            var hash = tokens.HashRefreshToken(raw!);
            var stored = await db.RefreshTokens.FirstOrDefaultAsync(
                t => t.TokenHash == hash && t.UserId == caller.RequireUserId(), ct);

            if (stored is { RevokedAtUtc: null })
            {
                stored.RevokedAtUtc = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
            }
        }

        AuthHelpers.DeleteRefreshCookie(ctx);
        return Results.NoContent();
    }
}
