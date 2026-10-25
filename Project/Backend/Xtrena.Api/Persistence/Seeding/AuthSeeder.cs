using System;
using Microsoft.EntityFrameworkCore;
using Xtrena.Api.Domain;
using Xtrena.Api.Domain.Constants;
using Xtrena.Api.Features.Auth.Common;

namespace Xtrena.Api.Persistence.Seeding;

public static class AuthSeeder
{
    public static async Task SeedAsync(XtrenaDbContext db, IPasswordService passwords, CancellationToken ct = default)
    {
        if (!await db.Roles.AnyAsync(ct))
        {
            db.Roles.AddRange(
                new Role { Code = RoleCodes.Admin, DisplayName = "Administrator", Description = "Full system access" },
                new Role { Code = RoleCodes.Manager, DisplayName = "Manager", Description = "Assign & monitor work" },
                new Role { Code = RoleCodes.Employee, DisplayName = "Employee", Description = "Carry tasks" });
            await db.SaveChangesAsync(ct);
        }

        if (!await db.Users.AnyAsync(u => u.Username == "admin", ct))
        {
            var adminRole = await db.Roles.FirstAsync(r => r.Code == RoleCodes.Admin, ct);
            var user = new User
            {
                Username = "admin",
                Email = "admin@xtrena.local",
                FullName = "System Administrator",
                PasswordHash = passwords.Hash("Admin!Passw0rd"),     // ★ seeded creds
                IsActive = true,
            };
            user.UserRoles.Add(new UserRole { User = user, RoleId = adminRole.Id });
            db.Users.Add(user);
            await db.SaveChangesAsync(ct);
        }
    }
}
