using System;
using Xtrena.Api.Domain;
using Xtrena.Api.Domain.Constants;
using Xtrena.Api.Persistence;
using Xtrena.Api.SharedKernel.Authorization;

namespace Xtrena.Api.Features.Auth.Common;

public class AuthHelpers
{
    internal const string RefreshCookieName = "xtrena_rt";
    internal const string RefreshCookiePath = "/api/v1/auth";

    // FE AuthUser
    internal static object ToAuthUser(UserProfileDto p) => new
    {
        userId = p.Id,
        username = p.Username,
        fullName = p.FullName,
        email = p.Email,
        roleCode = p.Roles.FirstOrDefault() ?? RoleCodes.Employee,
        employeeId = p.EmployeeId,
        permissions = p.Permissions,
    };

    internal static void AppendRefreshCookie(HttpContext ctx, string raw, IWebHostEnvironment env) =>
        ctx.Response.Cookies.Append(RefreshCookieName, raw, new CookieOptions
        {
            HttpOnly = true,
            // ★ dev = http://localhost — Secure=true -> browser cookie reject; prod true
            Secure = !env.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = RefreshCookiePath,
            IsEssential = true,
            Expires = DateTimeOffset.UtcNow.AddDays(SecurityConstants.RefreshTokenDays),
        });

    internal static void DeleteRefreshCookie(HttpContext ctx) =>
        ctx.Response.Cookies.Delete(RefreshCookieName, new CookieOptions { Path = RefreshCookiePath });

    // User → profile: roles highest-first, permissions = role lattice union.
    internal static UserProfileDto MapProfile(User user)
    {
        var roleSet = user.UserRoles.Select(ur => ur.Role.Code).ToHashSet();
        var roles = RoleCodes.All.Where(roleSet.Contains).ToArray();
        var isManager = roleSet.Contains(RoleCodes.Manager) || roleSet.Contains(RoleCodes.Admin);

        return new UserProfileDto(
            user.Id, user.Username, user.Email, user.FullName,
            roles, isManager, user.EmployeeId, user.Employee?.Code,
            PermissionNames.ForRoles(roles));
    }

    internal static string IssueRefreshToken(
        XtrenaDbContext db, IJwtTokenService tokens, User user,
        string ip, DateTime now, string? replacedByHash = null)
    {
        var raw = tokens.CreateRefreshToken();
        db.RefreshTokens.Add(new RefreshToken
        {
            TokenHash = tokens.HashRefreshToken(raw),
            UserId = user.Id,
            ExpiresAtUtc = now.AddDays(SecurityConstants.RefreshTokenDays),
            CreatedByIp = ip,
            ReplacedByHash = replacedByHash,
        });
        return raw;
    }
}
