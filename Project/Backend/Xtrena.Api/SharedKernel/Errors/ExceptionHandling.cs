using System;
using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;

namespace Xtrena.Api.SharedKernel.Errors;

public static class ExceptionHandling
{
    public static IResult ToResult(AppException ex) => ex switch
    {
        UnauthorizedException => Status(401, "Unauthorized", ex),
        ForbiddenException => Status(403, "Forbidden", ex),
        NotFoundException => Status(404, "Not Found", ex),
        ConflictException => Status(409, "Conflict", ex),
        ConcurrencyConflictException => Status(409, "Conflict", ex),
        BadRequestException => Status(400, "Bad Request", ex),
        UnprocessableException => Status(422, "Unprocessable Content", ex),
        ValidationException => Status(422, "Unprocessable Content", ex),
        DependencyUnavailableException => Status(503, "Service Unavailable", ex),
        _ => Status(500, "Internal Server Error", new InternalServerException()),
    };

    private static IResult Status(int code, string title, AppException ex) =>
        Results.Problem(
            title: title,
            detail: ex.Message,
            statusCode: code,
            extensions: new Dictionary<string, object?>
            {
                ["errors"] = ex.Errors,
                ["traceId"] = Activity.Current?.Id ?? "n/a",
            });

    // First call this in Program.cs
    public static IApplicationBuilder UseAppExceptionHandler(this IApplicationBuilder app) =>
        app.UseExceptionHandler(errApp => errApp.Run(async ctx =>
        {
            var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
            var result = ex switch
            {
                AppException ae => ToResult(ae),
                // model-binding failure → FR-011 mandates 400
                _ => Status(400, "Bad Request",
                    new BadRequestException("Request payload is invalid.")),
            };
            await result.ExecuteAsync(ctx);
        }));
}
