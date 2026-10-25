using System;

namespace Xtrena.Api.SharedKernel.Identity;

public interface ICurrentUser
{
    Guid UserId { get; }
    string? Username { get; }
    string? Email { get; }
    IReadOnlyCollection<string> Roles { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(string roleCode);
    Guid RequireUserId();
}
