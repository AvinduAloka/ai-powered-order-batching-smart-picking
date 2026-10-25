using System;
using System.Security.Claims;
using Xtrena.Api.Domain.Constants;

namespace Xtrena.Api.SharedKernel.Identity;

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid UserId => Guid.TryParse(Principal?.FindFirstValue(SecurityConstants.ClaimUserId), out var id) ? id : Guid.Empty;

    public string? Username => Principal?.FindFirstValue(SecurityConstants.ClaimUsername);

    public string? Email => Principal?.FindFirstValue(SecurityConstants.ClaimEmail);

    public IReadOnlyCollection<string> Roles => Principal?.FindAll(SecurityConstants.ClaimRole).Select(c => c.Value).Distinct().ToArray() ?? Array.Empty<string>();

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public bool IsInRole(string roleCode)
    {
        var roles = Roles;
        return roles.Contains(roleCode)
            || (roleCode == RoleCodes.Manager && roles.Contains(RoleCodes.Admin))
            || (roleCode == RoleCodes.Employee &&
                (roles.Contains(RoleCodes.Manager) || roles.Contains(RoleCodes.Admin)));
    }

    public Guid RequireUserId() => 
        UserId == Guid.Empty
            ? throw new UnauthorizedAccessException("User id claim is missing")
            : UserId;
}
