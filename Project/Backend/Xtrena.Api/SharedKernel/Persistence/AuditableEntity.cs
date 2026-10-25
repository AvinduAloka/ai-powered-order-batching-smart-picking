using System;

namespace Xtrena.Api.SharedKernel.Persistence;

public abstract class AuditableEntity
{
    public Guid Id { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
