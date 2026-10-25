using System;
using Microsoft.EntityFrameworkCore;
using Xtrena.Api.Domain;

namespace Xtrena.Api.Persistence;

public sealed class XtrenaDbContext(DbContextOptions<XtrenaDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.ApplyConfigurationsFromAssembly(typeof(XtrenaDbContext).Assembly);
    }
}

