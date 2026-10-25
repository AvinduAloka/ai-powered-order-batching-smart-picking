using System;

namespace Xtrena.Api.Domain;

public class Role
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsSystem { get; set; } = true;

    public ICollection<UserRole> UserRoles { get; set; } = [];
}
