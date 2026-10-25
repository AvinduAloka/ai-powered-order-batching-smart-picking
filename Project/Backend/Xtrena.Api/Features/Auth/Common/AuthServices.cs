using System;

namespace Xtrena.Api.Features.Auth.Common;

public static class AuthServices
{
    public static IServiceCollection AddAuthFeature(this IServiceCollection services, IConfiguration config)
    {
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.Configure<JwtOptions>(config.GetSection("Jwt"));
        return services;
    }
}
