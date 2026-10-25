using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Xtrena.Api.Domain;
using Xtrena.Api.Domain.Constants;

namespace Xtrena.Api.Persistence.Configurations;

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> b)
    {
        b.ToTable("Roles");
        b.HasKey(x => x.Id);

        b.Property(x => x.Code).HasMaxLength(16).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();
        b.Property(x => x.DisplayName).HasMaxLength(64).IsRequired();
        b.Property(x => x.Description).HasMaxLength(256);

        // ★ DB-level: role code තුන විතරයි
        b.ToTable(t => t.HasCheckConstraint("CK_Roles_Code",
            $"[Code] IN ('{RoleCodes.Admin}', '{RoleCodes.Manager}', '{RoleCodes.Employee}')"));
    }
}
