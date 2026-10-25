using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Xtrena.Api.Domain;

namespace Xtrena.Api.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("Users");
        b.HasKey(x => x.Id);

        b.Property(x => x.Username).HasMaxLength(64).IsRequired();
        b.HasIndex(x => x.Username).IsUnique();

        b.Property(x => x.Email).HasMaxLength(256).IsRequired();
        b.HasIndex(x => x.Email).IsUnique();

        b.Property(x => x.PasswordHash).HasMaxLength(256).IsRequired();
        b.Property(x => x.FullName).HasMaxLength(200).IsRequired();
        b.Property(x => x.RowVersion).IsRowVersion();      // ★ lost-update prevention

        // ★ FR-002: locked account filter index
        b.HasIndex(x => x.LockoutEndUtc).HasFilter("[LockoutEndUtc] IS NOT NULL");

        b.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
