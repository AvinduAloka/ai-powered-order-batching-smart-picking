using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Xtrena.Api.Features.Auth.Common;
using Xtrena.Api.Persistence;

namespace Xtrena.Api.Features.Auth.Refresh;

public static class Refresh
{
    public static RouteHandlerBuilder MapRefresh(this IEndpointRouteBuilder auth) =>
        auth.MapPost("/refresh", HandleAsync)
            .AllowAnonymous()
            .WithName("RefreshToken");

    private static async Task<IResult> HandleAsync(
        HttpContext ctx, IWebHostEnvironment env, XtrenaDbContext db,
        IJwtTokenService tokens, TimeProvider clock, CancellationToken ct)
    {
        if (!ctx.Request.Cookies.TryGetValue(AuthHelpers.RefreshCookieName, out var raw))
            return Results.Unauthorized();

        var now = clock.GetUtcNow().UtcDateTime;
        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var hash = tokens.HashRefreshToken(raw!);

        var stored = await db.RefreshTokens
            .Include(t => t.User).ThenInclude(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(t => t.User).ThenInclude(u => u.Employee)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null || stored.RevokedAtUtc is not null || stored.ExpiresAtUtc < now)
            throw new ValidationException("Refresh token is invalid or expired.");
        if (!stored.User.IsActive)
            throw new ValidationException("Account is disabled.");

        // rotation + reuse detection — all refreshs are new row, old revoke
        stored.RevokedAtUtc = now;

        var profile = AuthHelpers.MapProfile(stored.User);
        var (access, expires) = tokens.CreateAccessToken(profile);
        var newRaw = AuthHelpers.IssueRefreshToken(db, tokens, stored.User, ip, now, hash);
        await db.SaveChangesAsync(ct);

        AuthHelpers.AppendRefreshCookie(ctx, newRaw, env);
        return Results.Ok(new
        {
            accessToken = access,
            expiresAtUtc = expires,
            expiresIn = (int)(expires - now).TotalSeconds,
            user = AuthHelpers.ToAuthUser(profile),
        });
    }
}
