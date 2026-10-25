using System;
using Xtrena.Api.Domain.Constants;

namespace Xtrena.Api.Features.Auth.Common;

public class JwtOptions
{
    public string Key { get; set; } = string.Empty;      // ★ ≥ 32 bytes, HS256
    public string Issuer { get; set; } = null!;
    public string Audience { get; set; } = null!;
    public int AccessTokenMinutes { get; set; } = SecurityConstants.AccessTokenMinutes;
    public int RefreshTokenDays { get; set; } = SecurityConstants.RefreshTokenDays;
}
