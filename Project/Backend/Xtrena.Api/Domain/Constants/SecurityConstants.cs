using System;

namespace Xtrena.Api.Domain.Constants;

public static class SecurityConstants
{
    // password policy
    public const int PasswordMinLength = 12;
    public const int PasswordMaxLength = 128;
    public const int MaxFailedLoginsBeforeLockout = 5;
    public const int LockoutMinutes = 15;

    // token lifetimes
    public const int AccessTokenMinutes = 15;
    public const int RefreshTokenDays = 7;

    // JWT claim names
    public const string ClaimUserId = "sub";
    public const string ClaimUsername = "unique_name";
    public const string ClaimFullName = "name";
    public const string ClaimEmail = "email";
    public const string ClaimRole = "role";
    public const string ClaimEmployeeId = "emp_id";
}
