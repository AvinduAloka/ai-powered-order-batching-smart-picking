using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Xtrena.Api.Domain.Constants;

namespace Xtrena.Api.Features.Auth.Common;

public sealed class JwtTokenService(IOptions<JwtOptions> options) : IJwtTokenService
{
    private readonly JwtOptions _o = options.Value;

    public (string AccessToken, DateTime ExpiresAtUtc) CreateAccessToken(UserProfileDto user)
    {
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(_o.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(SecurityConstants.ClaimUserId, user.Id.ToString()),
            new(SecurityConstants.ClaimUsername, user.Username),
            new(SecurityConstants.ClaimFullName, user.FullName),
            new(SecurityConstants.ClaimEmail, user.Email),
            new(SecurityConstants.ClaimRole, user.Roles.First()),   // ★ primary role
        };

        // ★ multiple roles → multiple "role" claims (string collection නොවේ)
        claims.AddRange(user.Roles.Skip(1)
            .Select(r => new Claim(SecurityConstants.ClaimRole, r)));

        if (user.EmployeeId is int empId)
            claims.Add(new Claim(SecurityConstants.ClaimEmployeeId, empId.ToString()));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_o.Key));
        var jwt = new JwtSecurityToken(
            issuer: _o.Issuer,
            audience: _o.Audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(jwt), expires);
    }

    public string CreateRefreshToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));   // ★ 512-bit random

    public string HashRefreshToken(string raw)
    {
        // ★ raw token කවදාවත් DB එකට යන්නේ නෑ
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash);
    }
    
}
