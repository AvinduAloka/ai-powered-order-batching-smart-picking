using System;
using Xtrena.Api.SharedKernel.Persistence;

namespace Xtrena.Api.Domain;

public sealed class User : AuditableEntity
{
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public bool IsActive { get; set; } = true;

    public DateTime? LastLoginAtUtc { get; set; }
    public int? FailedLoginCount { get; set; }
    public DateTime? LockoutEndUtc { get; set; }

    // Employee link — M1 entity
    public int? EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
