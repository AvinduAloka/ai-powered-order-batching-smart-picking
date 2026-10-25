using System;

namespace Xtrena.Api.Domain;

public sealed class RefreshToken
{
    public int Id { get; set; }
    public string TokenHash { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? ReplacedByHash { get; set; }
    public string? CreatedByIp { get; set; }
}
