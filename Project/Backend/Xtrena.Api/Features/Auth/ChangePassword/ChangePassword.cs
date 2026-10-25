using System;
using Microsoft.EntityFrameworkCore;
using Xtrena.Api.Features.Auth.Common;
using Xtrena.Api.Persistence;
using Xtrena.Api.SharedKernel.Errors;
using Xtrena.Api.SharedKernel.Identity;

namespace Xtrena.Api.Features.Auth.ChangePassword;

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public static class ChangePassword
{
    public static RouteHandlerBuilder MapChangePassword(this IEndpointRouteBuilder auth) =>
        auth.MapPost("/change-password", HandleAsync)
            .RequireAuthorization()
            .WithName("ChangePassword");

    private static async Task<IResult> HandleAsync(
        ChangePasswordRequest request, ICurrentUser caller, XtrenaDbContext db,
        IPasswordService passwords, TimeProvider clock, CancellationToken ct)
    {
        var userId = caller.RequireUserId();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User", userId.ToString());

        if (!passwords.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedException("Current password is incorrect.");

        var policy = passwords.Validate(request.NewPassword);
        if (!policy.IsValid)
            throw new ValidationException(
                "Password policy failed: " + string.Join(" ", policy.Errors));

        user.PasswordHash = passwords.Hash(request.NewPassword);

        // ★ all other sessions revoked (FR-007)
        var now = clock.GetUtcNow().UtcDateTime;
        await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, now), ct);

        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }
}
