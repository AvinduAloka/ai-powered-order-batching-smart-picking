using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Xtrena.Api.Domain;

namespace Xtrena.Api.Persistence.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.ToTable("RefreshTokens");
        b.HasKey(x => x.Id);

        b.Property(x => x.TokenHash).HasMaxLength(128).IsRequired();
        b.HasIndex(x => x.TokenHash).IsUnique();        // cookie hash lookup
        b.Property(x => x.CreatedByIp).HasMaxLength(64);
        b.HasIndex(x => x.ExpiresAtUtc);

        b.HasOne(x => x.User).WithMany(u => u.RefreshTokens).HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);          // user delete → all tokens 
    }
}
