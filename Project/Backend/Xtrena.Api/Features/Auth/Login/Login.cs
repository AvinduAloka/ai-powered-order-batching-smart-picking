using System;
using Microsoft.EntityFrameworkCore;
using Xtrena.Api.Domain.Constants;
using Xtrena.Api.Features.Auth.Common;
using Xtrena.Api.Persistence;
using Xtrena.Api.SharedKernel.Errors;

namespace Xtrena.Api.Features.Auth.Login;

public sealed record LoginRequest(string Username, string Password);

public static class Login
{
    public static RouteHandlerBuilder MapLogin(this IEndpointRouteBuilder auth) =>
        auth.MapPost("/login", HandleAsync)
            .AllowAnonymous()
            .RequireRateLimiting("login")   // ★ FR-001 brute-force: 10/min/IP
            .WithName("Login")
            .WithSummary("FR-001 authenticate and receive JWT");

    private static async Task<IResult> HandleAsync(
        LoginRequest request, HttpContext ctx, IWebHostEnvironment env,
        XtrenaDbContext db, IPasswordService passwords, IJwtTokenService tokens,
        TimeProvider clock, ILoggerFactory logFactory, CancellationToken ct)
    {
        var log = logFactory.CreateLogger("Xtrena.Features.Login");
        var now = clock.GetUtcNow().UtcDateTime;
        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        var user = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Username == request.Username, ct);

        // User / Password Same message -> no user enumeration -> 401
        if (user is null || !user.IsActive)
            throw new UnauthorizedException("Invalid username or password.");

        // locked → 403 ( not 401 :  KNOWN user, bad state — FR-001 mandates this split)
        if (user.LockoutEndUtc is not null && user.LockoutEndUtc > now)
            throw new ForbiddenException(
                $"Account locked. Try again after {user.LockoutEndUtc:u}.");

        if (!passwords.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginCount = (user.FailedLoginCount ?? 0) + 1;
            if (user.FailedLoginCount >= SecurityConstants.MaxFailedLoginsBeforeLockout)
            {
                user.LockoutEndUtc = now.AddMinutes(SecurityConstants.LockoutMinutes);
                log.LogWarning("Account locked after {Count} failures: {User}",
                    user.FailedLoginCount, user.Username);
            }
            await db.SaveChangesAsync(ct);
            throw new UnauthorizedException("Invalid username or password.");
        }

        // FR-002 success → counters reset
        user.FailedLoginCount = 0;
        user.LockoutEndUtc = null;
        user.LastLoginAtUtc = now;

        var profile = AuthHelpers.MapProfile(user);
        var (access, expires) = tokens.CreateAccessToken(profile);
        var refreshRaw = AuthHelpers.IssueRefreshToken(db, tokens, user, ip, now);
        await db.SaveChangesAsync(ct);
        log.LogInformation("Login OK {Username} ip={Ip}", user.Username, ip);

        AuthHelpers.AppendRefreshCookie(ctx, refreshRaw, env);
        return Results.Ok(new
        {
            accessToken = access,
            expiresAtUtc = expires,
            expiresIn = (int)(expires - now).TotalSeconds,
            user = AuthHelpers.ToAuthUser(profile),
        });
    }


}