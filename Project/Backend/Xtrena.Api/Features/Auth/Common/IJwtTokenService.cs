using System;

namespace Xtrena.Api.Features.Auth.Common;

public interface IJwtTokenService
{
    (string AccessToken, DateTime ExpiresAtUtc) CreateAccessToken(UserProfileDto user);
    string CreateRefreshToken();
    string HashRefreshToken(string raw);
}
