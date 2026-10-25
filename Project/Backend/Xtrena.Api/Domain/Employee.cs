using System;

namespace Xtrena.Api.Domain;

public sealed class Employee
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public bool IsAvailable { get; set; } = true;
    public DateTime? AvailableFromUtc { get; set; }


    public decimal MaxCarryWeightKg { get; set; } = 25m;
    public decimal MaxCarryVolumeM3 { get; set; } = 0.35m;
}
