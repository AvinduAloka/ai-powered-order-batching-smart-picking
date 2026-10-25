using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Xtrena.Api.Domain;

namespace Xtrena.Api.Persistence.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> b)
    {
        b.ToTable("Employees");
        b.HasKey(x => x.Id);

        b.Property(x => x.Code).HasMaxLength(32).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();
        b.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        b.Property(x => x.MaxCarryWeightKg).HasPrecision(10, 2);   // ★ rule 1.3
        b.Property(x => x.MaxCarryVolumeM3).HasPrecision(10, 3);
    }
}
