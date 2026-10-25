using System;
using Xtrena.Api.Features.Auth.ChangePassword;
using Xtrena.Api.Features.Auth.Login;
using Xtrena.Api.Features.Auth.Logout;
using Xtrena.Api.Features.Auth.Me;
using Xtrena.Api.Features.Auth.Refresh;
using Xtrena.Api.Features.Users.GetUser;
using Xtrena.Api.Features.Users.ListUsers;

namespace Xtrena.Api.Features;

public static class FeatureExtensions
{
    public static IEndpointRouteBuilder MapFeatures(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/auth").WithTags("Auth");
        auth.MapLogin();
        auth.MapRefresh();
        auth.MapLogout();
        auth.MapMe();
        auth.MapChangePassword();

        var users = app.MapGroup("/users").WithTags("Users");
        users.MapListUsers();
        users.MapGetUser();

        return app;
    }
}
