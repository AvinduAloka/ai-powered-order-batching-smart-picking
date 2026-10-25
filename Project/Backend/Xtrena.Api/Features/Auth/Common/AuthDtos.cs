using System;

namespace Xtrena.Api.Features.Auth.Common;

// login / refresh response on token payload
public sealed record TokenResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAtUtc,
    int ExpiresInSeconds,
    UserProfileDto User,
    // Raw refresh token — HttpOnly cookie on set (Not on body)
    string RefreshToken);

// FE src/types/index.ts AuthUser -> sync -> user shape.
public sealed record UserProfileDto(
    Guid Id,
    string Username,
    string Email,
    string FullName,
    IReadOnlyList<string> Roles, 
    bool IsManager, 
    int? EmployeeId,
    string? EmployeeCode,
    IReadOnlyList<string> Permissions);
